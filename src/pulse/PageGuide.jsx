import InfoTip from './InfoTip';
const guides={
  sentiment:['Cara membaca sentimen','Klik segmen grafik untuk membaca posting sesuai tanggal dan sentimen. Pilih tanggal pada panel perubahan untuk membandingkan dengan hari sebelumnya. Progress di atas mencakup seluruh project; ringkasan halaman mengikuti periode terpilih. Label menggambarkan nada teks, bukan dukungan politik.'],
  overview:['Mulai dari ringkasan','Lihat jumlah posting dan perubahan percakapan. Buka Posting untuk membaca sumbernya, atau Jaringan untuk menelusuri hubungan akun.'],
  network:['Cara menelusuri penyebaran','Pilih Hubungan akun untuk melihat peta. Pilih Awal & konten serupa untuk membandingkan urutan publikasi. Sinyal akun membantu memilih akun yang perlu diperiksa, bukan memastikan bot.'],
  posts:['Cara memeriksa posting','Pilih platform dan periode di bagian project. Posting individual dan Kelompok percakapan memakai cakupan yang sama. Buka kelompok untuk melihat sumber terpilih, atau gunakan filter lanjutan untuk menelusuri posting individual. Angka interaksi hanya mencakup metrik yang tersedia.'],
  comments:['Cara membaca komentar','Ambil komentar posting secara bertahap, lalu baca semuanya atau pilih satu posting. Urutkan berdasarkan suka atau waktu. Komentar tersimpan adalah sampel sampai 300 per posting, bukan seluruh opini publik.'],
  accounts:['Cara membandingkan akun','Cari nama akun dan pilih urutan berdasarkan interaksi atau jumlah posting. Ranking hanya berlaku pada data yang berhasil dikumpulkan.'],
  monitor:['Cara memantau pengumpulan','Buka Jadwal project untuk mengaktifkan atau menjeda sumber. Kuota global dibagi semua project. Jadwal aktif dapat tetap menunggu kuota; lihat antrean dan hasil otomatis di bawah.'],
  infographics:['Cara membaca infografik','Kata yang sering muncul menunjukkan frekuensi, bukan dukungan. Peta hanya memakai lokasi yang tersedia dari sumber, bukan perkiraan lokasi penulis.'],
};
export default function PageGuide({view}) {
  const guide=guides[view];
  if(!guide)return null;
  return <div className="ps-help-row">Panduan halaman<InfoTip label={guide[0]}>{guide[1]}</InfoTip></div>;
}
