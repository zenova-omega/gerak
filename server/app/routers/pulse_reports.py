"""Immutable, authenticated analyst snapshots. No collection/model side effects."""
import json
from datetime import date, datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select, func
from ..database import get_db
from ..models.pulse import WatchTopic, SourceItem
from ..models.pulse_report import PulseReport
from ..services.pulse_identity import require_pulse_access, session_identity, optional_bearer
from ..models.pulse_identity import PulseAudit
from ..services.pulse_public import without_engine
from ..services.pulse_measures import RULES, in_period, local_day

async def archive_access(request:Request,credentials=Depends(optional_bearer),db=Depends(get_db)):
    if credentials and not getattr(request.app.state,'pulse_only',False):
        return await require_pulse_access(request,credentials,db)
    user=await session_identity(request,db)
    if request.method not in ('GET','HEAD','OPTIONS'):
        if user.role not in ('owner','admin','analyst'): raise HTTPException(403,'Akses analis diperlukan')
        db.add(PulseAudit(user_id=user.id,action='POST report archive'))
    return user

router=APIRouter(dependencies=[Depends(archive_access)])

def strings(row,keys):
    for key in keys:
        if row.get(key) is not None and not isinstance(row[key],str): raise ValueError('Teks snapshot tidak valid')

def label(value,allow_string=False):
    if value is None or (allow_string and isinstance(value,str)): return
    if not isinstance(value,dict): raise ValueError('Hasil analisis tidak valid')
    strings(value,('label','reason','model','method','analyzed_at'))
    if value.get('confidence') is not None and type(value['confidence']) not in (float,int): raise ValueError('Confidence tidak valid')
    if value.get('review_needed') is not None and type(value['review_needed']) is not bool: raise ValueError('Penanda tinjauan tidak valid')

def comments(items):
    if not isinstance(items,list): raise ValueError('Komentar harus berupa daftar')
    for item in items:
        if not isinstance(item,dict) or not isinstance(item.get('id'),str): raise ValueError('ID komentar tidak valid')
        strings(item,('text','title','author','url','published_at'))
        label(item.get('sentiment'));label(item.get('stance'))

def metrics(value):
    if value is None:return
    if not isinstance(value,dict): raise ValueError('Metrik tidak valid')
    for key in ('engagement','likes','comments','shares','views'):
        if value.get(key) is not None and type(value[key]) not in (float,int): raise ValueError('Angka metrik tidak valid')
    label(value.get('sentiment'),allow_string=True)
    snapshot=value.get('comment_snapshot')
    if snapshot is not None:
        if not isinstance(snapshot,dict): raise ValueError('Snapshot komentar tidak valid')
        comments(snapshot.get('items',[]))

class ArchiveCreate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    topic_id: str=Field(min_length=1,max_length=36)
    title: str=Field(min_length=1,max_length=160)
    snapshot: dict

    @model_validator(mode='after')
    def validate_snapshot(self):
        self.title=self.title.strip()
        if not self.title: raise ValueError('Judul laporan wajib diisi')
        s=self.snapshot
        if len(json.dumps(s,allow_nan=False).encode())>12_000_000: raise ValueError('Snapshot melebihi 12 MB')
        if not isinstance(s.get('topic'),dict) or s['topic'].get('id')!=self.topic_id: raise ValueError('Project snapshot tidak cocok')
        for key in ('label','query'):
            if not isinstance(s['topic'].get(key),str): raise ValueError('Metadata project tidak valid')
        try: datetime.fromisoformat(s['generatedAt'].replace('Z','+00:00'))
        except (KeyError,TypeError,ValueError,AttributeError): raise ValueError('Waktu snapshot tidak valid')
        period=s.get('period')
        if not isinstance(period,dict): raise ValueError('Periode tidak valid')
        if set(period)-{'from','to'}: raise ValueError('Periode hanya menerima from dan to')
        try:
            start=date.fromisoformat(period['from']) if period.get('from') else None
            end=date.fromisoformat(period['to']) if period.get('to') else None
        except (ValueError,TypeError): raise ValueError('Tanggal tidak valid')
        if start and end and start>end: raise ValueError('Periode terbalik')
        platforms=s.get('selectedPlatforms')
        if platforms is not None and (not isinstance(platforms,list) or len(platforms)>20 or any(not isinstance(p,str) for p in platforms)): raise ValueError('Platform tidak valid')
        posts=s.get('posts')
        if not isinstance(posts,list) or len(posts)>10000: raise ValueError('Maksimal 10.000 posting')
        ids=set()
        for p in posts:
            if not isinstance(p,dict) or not isinstance(p.get('id'),str) or p['id'] in ids: raise ValueError('ID posting tidak valid/duplikat')
            ids.add(p['id'])
            if platforms is not None and p.get('platform') not in platforms: raise ValueError('Posting di luar platform snapshot')
            for key in ('text','title','author','url','platform'):
                if p.get(key) is not None and not isinstance(p[key],str): raise ValueError('Teks posting tidak valid')
            metrics(p.get('metrics'))
            if start or end:
                day=local_day(p.get('published_at'))
                if day is None: raise ValueError('Tanggal posting tidak valid')
                if not in_period(p['published_at'],start,end): raise ValueError('Posting di luar periode snapshot')
        response=s.get('responseAnalysis')
        if not isinstance(response,dict) or response.get('loaded') is not True or response.get('error') is not False: raise ValueError('Respons belum selesai dimuat')
        body=response.get('response')
        if body is not None:
            if not isinstance(body,dict) or not isinstance(body.get('posts',[]),list): raise ValueError('Respons tidak valid')
            strings(body,('target','topic_id'))
            for row in body.get('posts',[]):
                if not isinstance(row,dict) or not isinstance(row.get('post_id'),str) or row['post_id'] not in ids: raise ValueError('Respons di luar posting snapshot')
                label(row.get('stance'));comments(row.get('comments',[]))
            progress=body.get('progress')
            if progress is not None:
                if not isinstance(progress,dict): raise ValueError('Progress tidak valid')
                for key in ('running','pending','failed'):
                    if progress.get(key) is not None and type(progress[key]) is not int: raise ValueError('Angka progress tidak valid')
        # Keep only the versioned source inputs. Derived totals are rebuilt on read by UI.
        # A report is handed around, so it is filed without the engine behind its labels.
        self.snapshot=without_engine({k:s[k] for k in ('topic','period','generatedAt','posts','responseAnalysis')})
        self.snapshot['selectedPlatforms']=platforms
        # The calculation rules in force at filing, written by the server. A report is rebuilt with the rules of the day
        # it is opened; the page compares these with the current ones and says when its figures were recounted.
        self.snapshot['rules']=dict(RULES)
        return self

def metadata(row):
    s=row.snapshot
    return {'id':row.id,'topic_id':row.topic_id,'title':row.title,'version':row.version,
            'created_at':row.created_at.isoformat()+'Z','created_by':row.created_by,
            'period':s['period'],'platforms':s['selectedPlatforms'],'post_count':len(s['posts'])}

class PdfRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    html:str=Field(min_length=20,max_length=8_000_000)
    filename:str=Field(default='laporan-pulse.pdf',max_length=160)


@router.post('/pdf')
async def make_pdf(body:PdfRequest):
    """The report pages the browser shows, as a PDF file. The document is checked before it is rendered: see
    services/pulse_report_pdf.py. 503 means this installation has no renderer; the app then offers the print dialog."""
    import base64
    from ..services import pulse_report_pdf as renderer
    try:
        renderer.check_document(body.html)
    except ValueError as exc:
        raise HTTPException(400,f'Dokumen laporan ditolak: {exc}.')
    try:
        made=await renderer.render_pdf(body.html)
    except renderer.PdfUnavailable:
        raise HTTPException(503,'Pembuat PDF belum tersedia di instalasi ini.')
    except renderer.PdfFailed:
        raise HTTPException(502,'PDF belum berhasil dibuat. Coba lagi.')
    return {'filename':renderer.safe_file_name(body.filename),'pdf':base64.b64encode(made).decode('ascii'),
            'pages':renderer.pdf_pages(made),'bytes':len(made)}


@router.get('/settings')
async def report_settings(topic_id:str=Query(...,min_length=1,max_length=36),db=Depends(get_db)):
    from ..services import pulse_report_settings
    if await db.get(WatchTopic,topic_id) is None:
        raise HTTPException(404,'Project tidak ditemukan.')
    return await pulse_report_settings.read(db,topic_id)


@router.put('/settings')
async def save_report_settings(body:dict,topic_id:str=Query(...,min_length=1,max_length=36),db=Depends(get_db)):
    from ..services import pulse_report_settings
    if await db.get(WatchTopic,topic_id) is None:
        raise HTTPException(404,'Project tidak ditemukan.')
    try:
        return await pulse_report_settings.save(db,topic_id,body)
    except ValueError as exc:
        raise HTTPException(422,str(exc))


@router.post('',status_code=201)
async def create(body:ArchiveCreate,db=Depends(get_db),actor=Depends(archive_access)):
    if await db.get(WatchTopic,body.topic_id) is None: raise HTTPException(404,'Project tidak ditemukan')
    ids=[p['id'] for p in body.snapshot['posts']]
    for offset in range(0,len(ids),500):
        chunk=ids[offset:offset+500]
        count=await db.scalar(select(func.count()).select_from(SourceItem).where(SourceItem.topic_id==body.topic_id,SourceItem.id.in_(chunk)))
        if count!=len(chunk): raise HTTPException(422,'Posting bukan bagian project ini')
    row=PulseReport(topic_id=body.topic_id,title=body.title,snapshot=body.snapshot,created_by=actor.id)
    db.add(row)
    await db.flush()
    return metadata(row)

@router.get('')
async def listing(topic_id:str=Query(...,min_length=1,max_length=36),offset:int=Query(0,ge=0),db=Depends(get_db)):
    if await db.get(WatchTopic,topic_id) is None: raise HTTPException(404,'Project tidak ditemukan')
    query=select(PulseReport).where(PulseReport.topic_id==topic_id)
    total=await db.scalar(select(func.count()).select_from(query.subquery()))
    rows=(await db.execute(query.order_by(PulseReport.created_at.desc(),PulseReport.id).offset(offset).limit(20))).scalars()
    return {'items':[metadata(r) for r in rows],'total':total,'offset':offset,'limit':20}

@router.get('/{report_id}')
async def read(report_id:str,topic_id:str=Query(...,min_length=1,max_length=36),db=Depends(get_db)):
    row=await db.get(PulseReport,report_id)
    if row is None or row.topic_id!=topic_id: raise HTTPException(404,'Arsip tidak ditemukan pada project ini')
    return {**metadata(row),'snapshot':without_engine(row.snapshot)}   # reports filed before the rule still carry it
