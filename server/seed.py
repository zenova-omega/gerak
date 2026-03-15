"""Seed the database with initial data for SINAR."""
import asyncio
from app.database import engine, async_session, Base
from app.models import *
from app.middleware.auth import hash_password


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ═══ KODAM ═══
        kodams = [
            Kodam(id=f"kd-{i}", name=name, city=city, lat=lat, lng=lng, region=region)
            for i, (name, city, lat, lng, region) in enumerate([
                ("Kodam I/Bukit Barisan", "Medan", 3.595, 98.672, "Sumatera"),
                ("Kodam II/Sriwijaya", "Palembang", -2.976, 104.775, "Sumatera"),
                ("Kodam III/Siliwangi", "Bandung", -6.917, 107.619, "Jawa"),
                ("Kodam Jaya", "Jakarta", -6.175, 106.865, "Jawa"),
                ("Kodam IV/Diponegoro", "Semarang", -6.966, 110.419, "Jawa"),
                ("Kodam V/Brawijaya", "Surabaya", -7.250, 112.751, "Jawa"),
                ("Kodam VI/Mulawarman", "Balikpapan", -1.267, 116.831, "Kalimantan"),
                ("Kodam VII/Wirabuana", "Makassar", -5.147, 119.432, "Sulawesi"),
                ("Kodam IX/Udayana", "Denpasar", -8.650, 115.219, "Bali-Nusra"),
                ("Kodam XII/Tanjungpura", "Pontianak", -0.015, 109.332, "Kalimantan"),
                ("Kodam XIII/Merdeka", "Manado", 1.487, 124.841, "Sulawesi"),
                ("Kodam XIV/Hasanuddin", "Makassar", -5.135, 119.423, "Sulawesi"),
                ("Kodam XVI/Pattimura", "Ambon", -3.695, 128.176, "Maluku"),
                ("Kodam XVII/Cenderawasih", "Jayapura", -2.537, 140.718, "Papua"),
                ("Kodam XVIII/Kasuari", "Manokwari", -0.867, 134.083, "Papua"),
            ])
        ]
        db.add_all(kodams)

        # ═══ ADMIN USER ═══
        admin_user = User(
            id="admin-001", nrp="ADMIN001", name="Super Admin",
            password_hash=hash_password("admin2026"),
            role=Role.ADMIN, account_type=AccountType.PRAJURIT,
            satuan="DISPENAD", kodam_id="kd-3", rank=4, xp=99999,
            tier=Tier.GOLD,
        )
        db.add(admin_user)

        # ═══ SAMPLE USERS ═══
        users = [
            User(id=f"usr-{i}", nrp=nrp, name=name, password_hash=hash_password("sinar2026"),
                 role=Role.PRAJURIT, account_type=AccountType.PRAJURIT,
                 satuan=satuan, kodam_id=f"kd-{kodam}", rank=rank, xp=xp, tier=tier)
            for i, (nrp, name, satuan, kodam, rank, xp, tier) in enumerate([
                ("33208456", "Kpt. Rina Dewi", "Yonif 403/WP", 2, 3, 6200, Tier.GOLD),
                ("31205789", "Ltn. Budi Hartono", "Yonif 315/Garuda", 3, 2, 5800, Tier.GOLD),
                ("32401234", "Srs. Fajar Nugroho", "Yon Armed 1/Divif 1", 4, 2, 5400, Tier.SILVER),
                ("31200456", "Mayor Arif Santoso", "Yonif 403/WP", 2, 1, 4820, Tier.SILVER),
                ("34107892", "Kpl. Sari Utami", "Kodam III/Siliwangi", 2, 1, 4600, Tier.SILVER),
                ("31209876", "Ratna Sari", "Kodam Jaya", 3, 1, 3200, Tier.BRONZE),
                ("35602345", "Dedi Prasetyo", "Kodam V/Brawijaya", 5, 0, 2100, Tier.BRONZE),
                ("32804567", "Ahmad Rizki", "Kodam IV/Diponegoro", 4, 0, 1800, Tier.BRONZE),
                ("33506789", "Nina Safira", "Kodam III/Siliwangi", 2, 1, 3800, Tier.SILVER),
            ])
        ]
        db.add_all(users)

        # ═══ SAMPLE MISSIONS ═══
        missions = [
            Mission(id=f"mis-{i}", type=mtype, title=title, description=desc,
                    xp_reward=xp, status=status, image_url=img, created_by="admin-001")
            for i, (mtype, title, desc, xp, status, img) in enumerate([
                (MissionType.EVENT, "Upacara HUT TNI AD ke-81",
                 "Hadir dan dokumentasikan upacara peringatan HUT TNI AD. Abadikan momen kebanggaan prajurit di.",
                 400, MissionStatus.TERBUKA, "/images/mission-event-hut-tniad.png"),
                (MissionType.KONTEN, "Buat Video Reels #BanggaTNIAD",
                 "Buat video reels 30-60 detik tentang kebanggaan menjadi prajurit TNI AD.",
                 300, MissionStatus.TERBUKA, "/images/mission-konten-video-reels.png"),
                (MissionType.ENGAGEMENT, "Like & Share Konten Resmi TNI AD",
                 "Like, share, dan komentar positif di konten resmi TNI AD di Instagram, TikTok, dan X.",
                 200, MissionStatus.TERBUKA, "/images/mission-engagement-medsos.png"),
                (MissionType.EVENT, "Bakti Sosial Kodam III — Operasi Siliwangi Peduli",
                 "Ikut serta dalam kegiatan bakti sosial di wilayah Kodam III/Siliwangi.",
                 400, MissionStatus.TERBUKA, "/images/mission-event-baksos.png"),
                (MissionType.KONTEN, "Infografis Fakta TNI AD",
                 "Desain infografis tentang fakta dan prestasi TNI AD untuk media sosial.",
                 300, MissionStatus.TERBUKA, "/images/mission-konten-infografis.png"),
                (MissionType.EDUKASI, "Sosialisasi Wawasan Kebangsaan",
                 "Sebarkan materi wawasan kebangsaan ke minimal 5 grup WhatsApp keluarga/komunitas.",
                 250, MissionStatus.TERBUKA, "/images/mission-edukasi-wawasan.png"),
                (MissionType.AKSI, "Kampanye Modernisasi Alutsista",
                 "Galang dukungan publik untuk modernisasi alutsista TNI AD melalui petisi digital.",
                 350, MissionStatus.TERBUKA, "/images/mission-aksi-modernisasi.png"),
                (MissionType.ENGAGEMENT, "Challenge #BanggaTNIAD",
                 "Ikuti challenge viral #BanggaTNIAD di TikTok dan Instagram.",
                 200, MissionStatus.TERBUKA, "/images/mission-konten-challenge.png"),
            ])
        ]
        db.add_all(missions)

        # ═══ BADGES ═══
        badges = [
            Badge(id=f"bdg-{i}", name=name, description=desc, rarity=rarity, icon=icon)
            for i, (name, desc, rarity, icon) in enumerate([
                ("Misi Pertama", "Selesaikan misi pertamamu", "common", "flag"),
                ("10 Misi", "Selesaikan 10 misi", "rare", "emoji_events"),
                ("50 Misi", "Selesaikan 50 misi", "epic", "workspace_premium"),
                ("Misi Kilat", "Selesaikan misi dalam 1 jam", "rare", "bolt"),
                ("Siaga Bencana", "Ikut 5 misi bencana TNI AD", "epic", "volunteer_activism"),
                ("Streak 7", "7 hari berturut-turut aktif", "common", "local_fire_department"),
                ("Streak 30", "30 hari berturut-turut aktif", "epic", "whatshot"),
                ("Naik Pangkat", "Naik pangkat pertama kali", "common", "military_tech"),
                ("Amplifier", "Kontenmu di-share 100+ kali", "legendary", "campaign"),
                ("Viral King", "Kontenmu mencapai 10K+ views", "legendary", "trending_up"),
            ])
        ]
        db.add_all(badges)

        # ═══ SHOP ITEMS ═══
        shop_items = [
            ShopItem(id=f"shop-{i}", name=name, cost_xp=cost, stock=stock, category=cat, image_url=img)
            for i, (name, cost, stock, cat, img) in enumerate([
                ("Kaos Tactical TNI AD", 1500, 25, "apparel", "/images/shop-kaos-tactical-v2.png"),
                ("Jaket Parka TNI AD", 4500, 8, "apparel", "/images/shop-jaket-parka-v2.png"),
                ("Mug Keramik TNI AD", 600, 50, "merchandise", "/images/shop-mug-keramik-v2.png"),
                ("Pin Enamel TNI AD", 400, 100, "merchandise", "/images/shop-pin-enamel-v2.png"),
                ("Topi Tactical", 1200, 30, "apparel", "/images/shop-topi-tactical.png"),
                ("Tumbler TNI AD", 800, 40, "merchandise", "/images/shop-tumbler.png"),
                ("Voucher BRI 50K", 2000, 20, "sponsor", "/images/shop-voucher-bri.png"),
                ("Voucher Telkomsel 10GB", 1500, 30, "sponsor", "/images/shop-data-telkomsel.png"),
            ])
        ]
        db.add_all(shop_items)

        # ═══ SYSTEM SETTINGS ═══
        default_settings = [
            SystemSetting(key="default_xp_event", value="400"),
            SystemSetting(key="default_xp_konten", value="300"),
            SystemSetting(key="default_xp_engagement", value="200"),
            SystemSetting(key="default_xp_edukasi", value="250"),
            SystemSetting(key="default_xp_aksi", value="350"),
            SystemSetting(key="platforms_active", value="instagram,tiktok,youtube,x,whatsapp"),
            SystemSetting(key="notif_new_mission", value="true"),
            SystemSetting(key="notif_deadline_reminder", value="true"),
        ]
        db.add_all(default_settings)

        await db.commit()
        print("Database seeded successfully!")
        print(f"  - {len(kodams)} Kodam zones")
        print(f"  - 1 Admin user (NRP: ADMIN001, password: admin2026)")
        print(f"  - {len(users)} Sample users (password: sinar2026)")
        print(f"  - {len(missions)} Sample missions")
        print(f"  - {len(badges)} Badges")
        print(f"  - {len(shop_items)} Shop items")
        print(f"  - {len(default_settings)} System settings")


if __name__ == "__main__":
    asyncio.run(seed())
