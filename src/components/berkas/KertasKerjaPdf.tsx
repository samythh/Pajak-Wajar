import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatCurrency, formatPersenNorma, formatTanggalIndonesia, formatTarif } from '@/lib/format';
import { basisAturan, cariKlu } from '@/lib/regulasi';
import type { HasilAuditPajak, HasilSkema, IdSkema, StatusKelayakan } from '@/types/pajak';

/**
 * Kertas kerja satu berkas untuk disimpan pengguna.
 *
 * Berkas ini hanya menyusun ulang hasil `auditPajakMandiri`; tidak ada
 * perhitungan atau penilaian hukum baru yang terjadi di sini.
 */

const namaSkema: Record<IdSkema, string> = {
  PPH_FINAL_05: 'PPh Final UMKM 0,5%',
  NPPN: 'Norma Penghitungan Penghasilan Neto',
  TARIF_UMUM: 'Tarif umum Pasal 17'
};

const labelStatus: Record<StatusKelayakan, string> = {
  BOLEH: 'BOLEH DIPAKAI',
  TIDAK_BOLEH: 'TIDAK BOLEH DIPAKAI',
  PERLU_DIPASTIKAN: 'PERLU DIPASTIKAN'
};

const warnaStatus: Record<StatusKelayakan, string> = {
  BOLEH: '#17497D',
  TIDAK_BOLEH: '#A32E28',
  PERLU_DIPASTIKAN: '#7A5C15'
};

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingHorizontal: 42, paddingBottom: 68, fontSize: 9.5, color: '#14202E', fontFamily: 'Helvetica', lineHeight: 1.5 },
  judul: { fontSize: 21, lineHeight: 1.25, fontFamily: 'Helvetica-Bold', marginBottom: 9 },
  subjudul: { fontSize: 9, color: '#5E6B7A', marginBottom: 14 },
  penafian: {
    borderLeftWidth: 3,
    borderLeftColor: '#A32E28',
    paddingLeft: 8,
    paddingVertical: 6,
    marginBottom: 16,
    fontSize: 8.5,
    color: '#5E6B7A'
  },
  bagian: { marginBottom: 14 },
  bagianJudul: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.1,
    color: '#5E6B7A',
    marginBottom: 6,
    borderBottomWidth: 0.7,
    borderBottomColor: '#CBD3DC',
    paddingBottom: 3
  },
  baris: { flexDirection: 'row', marginBottom: 2.5 },
  kunci: { width: '46%', color: '#5E6B7A' },
  nilai: { width: '54%' },
  kartu: {
    borderWidth: 0.7,
    borderColor: '#CBD3DC',
    borderLeftWidth: 3,
    padding: 9,
    marginBottom: 8
  },
  kartuJudul: { fontSize: 16, lineHeight: 1.3, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  status: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 4 },
  poin: { flexDirection: 'row', marginBottom: 1.5 },
  penanda: { width: 11, color: '#5E6B7A' },
  isiPoin: { flex: 1 },
  sitasi: { fontSize: 7.5, color: '#5E6B7A', marginTop: 1 },
  hitungBaris: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 },
  hitungTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.7,
    borderTopColor: '#CBD3DC',
    marginTop: 3,
    paddingTop: 3,
    fontFamily: 'Helvetica-Bold'
  },
  kaki: {
    position: 'absolute',
    top: 801,
    left: 42,
    width: 511,
    fontSize: 7.5,
    color: '#5E6B7A',
    borderTopWidth: 0.7,
    borderTopColor: '#CBD3DC',
    paddingTop: 5,
    textAlign: 'center'
  }
});

function Baris({ kunci, nilai }: { kunci: string; nilai: string }) {
  return (
    <View style={s.baris} wrap={false}>
      <Text style={s.kunci}>{kunci}</Text>
      <Text style={s.nilai}>{nilai}</Text>
    </View>
  );
}

function Hitung({ kunci, nilai }: { kunci: string; nilai: string }) {
  return (
    <View style={s.hitungBaris} wrap={false}>
      <Text style={{ width: '65%', paddingRight: 12 }}>{kunci}</Text>
      <Text style={{ width: '35%', textAlign: 'right' }}>{nilai}</Text>
    </View>
  );
}

function RincianSkema({ skema }: { skema: HasilSkema }) {
  if (skema.statusKalkulasi !== 'TERSEDIA') {
    return <Text style={s.sitasi}>{skema.alasanKalkulasi}</Text>;
  }

  const r = skema.rincianKalkulasi;

  if (r.skema === 'PPH_FINAL_05') {
    return (
      <View style={{ marginTop: 5 }}>
        <Hitung kunci="Omzet pribadi tahun pajak" nilai={formatCurrency(r.omzetPribadi)} />
        <Hitung kunci="Pembebasan omzet (maksimum)" nilai={formatCurrency(r.batasPembebasan)} />
        <Hitung kunci="Dasar pengenaan pajak" nilai={formatCurrency(r.dasarPengenaan)} />
        <Hitung kunci="Tarif" nilai={formatTarif(r.tarif)} />
        <View style={s.hitungTotal}>
          <Text>Pajak usaha sebelum setoran final</Text>
          <Text>{formatCurrency(r.pajakTerutang)}</Text>
        </View>
        <Text style={s.sitasi}>Setoran final belum dikurangkan. Nominal ini hanya mencakup pajak usaha, belum termasuk pajak atas gaji atau penghasilan lainnya.</Text>
      </View>
    );
  }

  const dasarNeto =
    r.skema === 'NPPN'
      ? { label: `Norma ${formatPersenNorma(r.persenNorma)}`, nilai: formatCurrency(r.penghasilanNetoUsaha) }
      : { label: 'Omzet dikurangi biaya usaha', nilai: formatCurrency(r.penghasilanNetoUsaha) };

  return (
    <View style={{ marginTop: 5 }}>
      <Hitung kunci="Omzet pribadi tahun pajak" nilai={formatCurrency(r.omzetPribadi)} />
      {r.skema === 'TARIF_UMUM' && (
        <Hitung kunci="Biaya usaha" nilai={`- ${formatCurrency(r.biayaOperasional)}`} />
      )}
      <Hitung kunci={`Penghasilan neto (${dasarNeto.label})`} nilai={dasarNeto.nilai} />
      {r.penghasilanNetoPegawai > 0 && <Hitung kunci="Neto pegawai sebelum PTKP" nilai={formatCurrency(r.penghasilanNetoPegawai)} />}
      <Hitung kunci="Total penghasilan neto" nilai={formatCurrency(r.penghasilanNeto)} />
      <Hitung kunci="PTKP" nilai={`- ${formatCurrency(r.ptkp)}`} />
      <Hitung kunci="PKP (dibulatkan ke bawah, ribuan penuh)" nilai={formatCurrency(r.pkp)} />
      {r.lapisanTerpakai.map((lapis) => (
        <Hitung
          key={lapis.lapisan}
          kunci={`  Lapisan ${lapis.lapisan} · ${formatCurrency(lapis.bagianPkp)} × ${formatTarif(lapis.tarif)}`}
          nilai={formatCurrency(lapis.pajakLapisan)}
        />
      ))}
      <Hitung kunci="Pajak sebelum kredit" nilai={formatCurrency(r.pajakSebelumKredit)} />
      <Hitung kunci="Kredit bukti potong" nilai={`- ${formatCurrency(r.kreditBupot)}`} />
      <View style={s.hitungTotal}>
        <Text>Sisa setelah kredit bukti potong</Text>
        <Text>{formatCurrency(r.pajakTerutang)}</Text>
      </View>
      {r.kelebihanKredit > 0 && <Text style={s.penafian}>Kredit melebihi perkiraan pajak sebesar {formatCurrency(r.kelebihanKredit)}. Cocokkan dalam SPT; bukan janji restitusi.</Text>}
    </View>
  );
}

function jawaban(value: boolean | 'tidak_yakin' | undefined): string {
  return value === true ? 'Ya' : value === false ? 'Tidak' : 'Belum pasti';
}

export function KertasKerjaPdf({ hasil }: { hasil: HasilAuditPajak }) {
  const { profil } = hasil;
  const klu = cariKlu(profil.kluKode);

  return (
    <Document
      title={`Kertas kerja pra-lapor PajakWajar ${profil.tahunPajak}`}
      author="PajakWajar"
      subject="Ringkasan kelayakan dan perkiraan pajak"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.judul}>Kertas kerja pra-lapor pajak</Text>
        <Text style={s.subjudul}>
          PajakWajar · Tahun Pajak {profil.tahunPajak} · Disusun {formatTanggalIndonesia(hasil.tanggalAudit)}
        </Text>

        <Text style={s.penafian}>
          Dokumen ini alat bantu, bukan nasihat pajak dan bukan dokumen resmi DJP. Seluruh angka
          berasal dari data yang Anda isi sendiri. Cocokkan kembali melalui akun Coretax DJP, KPP
          tempat Anda terdaftar, atau Kring Pajak 1500200 sebelum mengisi SPT Tahunan.
        </Text>

        <View style={s.bagian}>
          <Text style={s.bagianJudul}>DATA YANG ANDA ISI</Text>
          <Baris kunci="Bentuk kegiatan" nilai={profil.bentukKegiatan.replaceAll('_', ' ')} />
          <Baris kunci="Status perpajakan pasangan" nilai={profil.statusPerpajakanPasangan.replaceAll('_', ' ')} />
          <Baris kunci="Neto pegawai sebelum PTKP" nilai={!profil.jugaPegawaiTetap ? 'Bukan pegawai' : profil.penghasilanNetoPegawai === undefined ? 'Belum diisi' : formatCurrency(profil.penghasilanNetoPegawai)} />
          <Baris
            kunci="Kegiatan usaha (KLU)"
            nilai={klu ? `${klu.nama} (${klu.kluKode})` : profil.kluKode}
          />
          <Baris kunci="Kelompok wilayah" nilai={basisAturan.kelompokWilayah[profil.wilayah].nama} />
          <Baris kunci="Keadaan keluarga (PTKP)" nilai={profil.statusPtkp} />
          <Baris
            kunci="Omzet pribadi tahun pajak berjalan"
            nilai={formatCurrency(profil.omzetPribadiTahunPajak)}
          />
          <Baris
            kunci="Omzet pribadi tahun pajak sebelumnya"
            nilai={formatCurrency(profil.omzetPribadiThnSebelumnya)}
          />
          <Baris
            kunci="Omzet pasangan tahun pajak sebelumnya"
            nilai={formatCurrency(profil.omzetPasanganThnSebelumnya)}
          />
          <Baris
            kunci="Omzet perseroan perorangan tahun sebelumnya"
            nilai={formatCurrency(profil.omzetSeluruhPerseroanPeroranganThnSebelumnya)}
          />
          <Baris
            kunci="Biaya usaha setahun"
            nilai={
              profil.biayaOperasionalRiil === undefined
                ? 'Belum diisi'
                : formatCurrency(profil.biayaOperasionalRiil)
            }
          />
          <Baris kunci="Total kredit bukti potong" nilai={formatCurrency(hasil.totalKreditBupot)} />
          <Baris kunci="Lebih dari satu kegiatan" nilai={jawaban(profil.punyaLebihDariSatuKegiatan)} />
          <Baris kunci="Riwayat melewati ambang sebelum tahun pembanding" nilai={jawaban(profil.pernahMelewatiAmbang)} />
          <Baris kunci="Pernah memilih tarif umum" nilai={jawaban(profil.pernahPilihTarifUmum)} />
          <Baris kunci="Pemberitahuan NPPN tahun ini tepat waktu" nilai={jawaban(profil.sudahMemberitahukanNppn)} />
          <Text style={{ ...s.bagianJudul, marginTop: 18 }}>RINGKASAN HASIL</Text>
          {hasil.skema.map((skema) => <View key={skema.id} style={{ marginBottom: 9 }} wrap={false}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{namaSkema[skema.id]}</Text>
            <Text style={{ color: warnaStatus[skema.statusKelayakan], fontSize: 8 }}>{labelStatus[skema.statusKelayakan]}</Text>
            <Text>{skema.statusKalkulasi === 'TERSEDIA' ? `${skema.id === 'PPH_FINAL_05' ? 'Pajak usaha sebelum setoran final' : 'Sisa setelah kredit'}: ${formatCurrency(skema.pajakTerutang)}` : 'Nominal belum ditampilkan. Lihat rincian skema.'}</Text>
          </View>)}
        </View>

        {hasil.peringatan.length > 0 && (
          <View style={s.bagian}>
            <Text style={s.bagianJudul}>HAL YANG PERLU ANDA PERHATIKAN</Text>
            {hasil.peringatan.map((teks, index) => (
              <View key={index} style={s.poin}>
                <Text style={s.penanda}>!</Text>
                <Text style={s.isiPoin}>{teks}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.kaki} fixed render={({ pageNumber, totalPages }) => `PajakWajar / ${hasil.versiRegulasi} / Halaman ${pageNumber} dari ${totalPages}`} />
      </Page>
      {hasil.skema.map((skema) => <Page key={skema.id} size="A4" style={s.page}>
        <Text style={s.judul}>Kelayakan dan perhitungan</Text>
        <Text style={s.subjudul}>PajakWajar / Tahun Pajak {profil.tahunPajak}</Text>
        <View style={s.bagian}>
          <Text style={s.bagianJudul}>HASIL PEMERIKSAAN KELAYAKAN</Text>
            <View key={skema.id} style={{ ...s.kartu, borderLeftColor: warnaStatus[skema.statusKelayakan] }}>
              <Text style={{ ...s.status, color: warnaStatus[skema.statusKelayakan] }}>
                {labelStatus[skema.statusKelayakan]}
              </Text>
              <Text style={s.kartuJudul}>{namaSkema[skema.id]}</Text>
              {skema.alasanKelayakan.map((alasan, index) => (
                <View key={index} style={s.poin}>
                  <Text style={s.penanda}>&ndash;</Text>
                  <Text style={s.isiPoin}>{alasan}</Text>
                </View>
              ))}
              {skema.konsekuensiJangkaPanjang ? (
                <View style={s.poin}>
                  <Text style={s.penanda}>!</Text>
                  <Text style={s.isiPoin}>{skema.konsekuensiJangkaPanjang}</Text>
                </View>
              ) : null}
              <RincianSkema skema={skema} />
              <Text style={s.sitasi}>
                Dasar hukum:{' '}
                {skema.dasarHukum
                  .map((d) => `${d.namaRegulasi} ${d.pasalAtauLampiran}`)
                  .join(' · ')}
              </Text>
            </View>
        </View>

        <Text style={s.kaki} fixed render={({ pageNumber, totalPages }) => `PajakWajar / ${hasil.versiRegulasi} / Halaman ${pageNumber} dari ${totalPages}`} />
      </Page>)}

      <Page size="A4" style={s.page}>
        <Text style={s.judul}>Saran dan langkah berikutnya</Text>
        <Text style={s.subjudul}>PajakWajar / Tahun Pajak {profil.tahunPajak}</Text>
        {hasil.langkahTindakLanjut.length > 0 && (
          <View style={s.bagian}>
            <Text style={s.bagianJudul}>SARAN BERDASARKAN JAWABAN ANDA</Text>
            {hasil.langkahTindakLanjut.map((teks, index) => (
              <View key={index} style={s.poin}>
                <Text style={s.penanda}>{index + 1}.</Text>
                <Text style={s.isiPoin}>{teks}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.penafian}>Saran ini berdasarkan jawaban dan perhitungan yang tersedia, bukan penetapan pajak. Verifikasi persyaratan dan dokumen Anda sebelum melapor.</Text>
        <Text style={s.kaki} fixed render={({ pageNumber, totalPages }) => `PajakWajar / ${hasil.versiRegulasi} / Halaman ${pageNumber} dari ${totalPages}`} />
      </Page>
    </Document>
  );
}
