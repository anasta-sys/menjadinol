--
-- PostgreSQL database dump
--

\restrict BRPFZeY2XWLNuhZ049GapClRCFSiR31La3pMLgR5f6R0Ic3avOvhfGsWyi36o2K

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: handle_new_reader(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_reader() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin

  if coalesce(
    new.raw_user_meta_data ->> 'role',
    ''
  ) = 'reader'
  then

    insert into public.reader_users (
      user_id,
      email,
      name,
      is_active,
      status
    )
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(
        new.raw_user_meta_data ->> 'name',
        ''
      ),
      true,
      'active'
    )
    on conflict (user_id)
    do update set
      email = excluded.email,
      name = excluded.name,
      updated_at = now();

  end if;

  return new;

end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;


--
-- Name: set_page_content_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_page_content_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: touch_site_page(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_site_page() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'author'::text NOT NULL,
    display_name text,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['writer'::text, 'admin'::text, 'superadmin'::text])))
);


--
-- Name: content_folder_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_folder_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folder_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    table_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    attachment_path text,
    attachment_name text,
    attachment_mime text,
    attachment_size bigint,
    author_id uuid,
    updated_by uuid,
    last_published_by uuid,
    CONSTRAINT content_folder_entries_attachment_mime_check CHECK (((attachment_mime IS NULL) OR (attachment_mime = ANY (ARRAY['application/pdf'::text, 'image/jpeg'::text, 'image/png'::text])))),
    CONSTRAINT content_folder_entries_attachment_size_check CHECK (((attachment_size IS NULL) OR ((attachment_size > 0) AND (attachment_size <= 12582912)))),
    CONSTRAINT content_folder_entries_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 100000))),
    CONSTRAINT content_folder_entries_content_check CHECK (((char_length(TRIM(BOTH FROM COALESCE(body, ''::text))) >= 1) OR ((jsonb_typeof(table_data) = 'object'::text) AND (jsonb_array_length(COALESCE((table_data -> 'headers'::text), '[]'::jsonb)) >= 1)) OR (attachment_path IS NOT NULL))),
    CONSTRAINT content_folder_entries_excerpt_check CHECK ((char_length(excerpt) <= 420)),
    CONSTRAINT content_folder_entries_slug_check CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT content_folder_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text]))),
    CONSTRAINT content_folder_entries_table_data_check CHECK ((jsonb_typeof(table_data) = 'object'::text)),
    CONSTRAINT content_folder_entries_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 180)))
);


--
-- Name: content_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT content_folders_description_check CHECK ((char_length(description) <= 500)),
    CONSTRAINT content_folders_section_check CHECK ((section = ANY (ARRAY['tentang'::text, 'artikel'::text, 'layanan'::text, 'ruang-belajar'::text, 'sinopsis'::text, 'kontak'::text]))),
    CONSTRAINT content_folders_slug_check CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT content_folders_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 120)))
);


--
-- Name: page_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_content (
    page_key text NOT NULL,
    eyebrow text DEFAULT ''::text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT page_content_description_check CHECK ((char_length(description) <= 4000)),
    CONSTRAINT page_content_eyebrow_check CHECK ((char_length(eyebrow) <= 60)),
    CONSTRAINT page_content_page_key_check CHECK ((page_key = ANY (ARRAY['tentang'::text, 'perjalanan'::text, 'ruang-belajar'::text, 'sinopsis'::text, 'artikel'::text, 'kontak'::text]))),
    CONSTRAINT page_content_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 240)))
);


--
-- Name: page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_views (
    id bigint NOT NULL,
    session_id text NOT NULL,
    path text NOT NULL,
    referrer text,
    device_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.page_views ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.page_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reader_active_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reader_active_sessions (
    user_id uuid NOT NULL,
    session_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reader_email_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reader_email_otps (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reader_email_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reader_email_otps ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.reader_email_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reader_login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reader_login_history (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    reader_name text,
    logged_in_at timestamp with time zone DEFAULT now() NOT NULL,
    device text DEFAULT 'Unknown device'::text NOT NULL,
    os text DEFAULT 'Unknown OS'::text NOT NULL,
    browser text DEFAULT 'Unknown browser'::text NOT NULL
);


--
-- Name: reader_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reader_login_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reader_login_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reader_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reader_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reader_users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text])))
);


--
-- Name: site_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_pages (
    slug text NOT NULL,
    eyebrow text DEFAULT ''::text NOT NULL,
    title text NOT NULL,
    lead text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_pages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 20000))),
    CONSTRAINT site_pages_lead_check CHECK ((char_length(lead) <= 800)),
    CONSTRAINT site_pages_slug_check CHECK ((slug = ANY (ARRAY['tentang'::text, 'layanan'::text, 'kontak'::text]))),
    CONSTRAINT site_pages_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 180)))
);


--
-- Name: writer_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.writer_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    display_name text NOT NULL,
    requested_access text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT writer_applications_requested_access_check CHECK ((requested_access = ANY (ARRAY['writer'::text, 'admin'::text]))),
    CONSTRAINT writer_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE writer_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.writer_applications IS 'Permohonan akses Penulis/Admin. Superadmin tidak dapat diminta dari form publik.';


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (user_id, created_at, role, display_name) FROM stdin;
1a7b0f9b-4023-4c71-9f8f-ce280372607e	2026-08-23 06:33:36.857437+00	superadmin	Anasta
f84bbdf3-1d21-4033-83e2-d7e339cc369b	2026-09-01 13:24:21.080663+00	admin	Adenia
\.


--
-- Data for Name: content_folder_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_folder_entries (id, folder_id, title, slug, excerpt, body, status, published_at, created_at, updated_at, table_data, attachment_path, attachment_name, attachment_mime, attachment_size, author_id, updated_by, last_published_by) FROM stdin;
5e73b175-38d0-4c37-9712-6125adaa255b	e25d89c7-6868-4b6d-a815-b89190af1660	Level Jiwa	level-jiwa	tidak ada	Tingkatan Nafs\tArti\tCiri Utama\tRujukan\r\nNafs Ammārah       (النفس الأمارة)   \tJiwa yang memerintah kepada keburukan\tDikuasai hawa nafsu, ego, amarah, iri, dengki, dan syahwat\tQS. Yusuf (12):53\r\nNafs Lawwāmah    (النفس اللوامة)\t        Jiwa yang mencela diri\tMenyesali kesalahan, muncul rasa bersalah, mulai introspeksi dan ingin berubah\tQS. Al-Qiyamah (75):2\r\nNafs Mulhamah    (النفس الملهمة)\t        Jiwa yang mendapat ilham\tMulai mudah menerima petunjuk, mencintai kebaikan, tumbuh sabar, syukur, dan ikhlas\tQS. Asy-Syams (91):7–8 (dasar konsep ilham)\r\nNafs Muṭma'innah (النفس المطمئنة)    Jiwa yang tenang\tHati tenteram, penuh tawakal, damai dalam suka maupun duka\tQS. Al-Fajr (89):27–30\r\nNafs Rāḍiyah          (النفس الراضية)\tJiwa yang ridha\tMenerima ketetapan Allah dengan lapang, tidak mudah mengeluh\tDikembangkan dalam literatur tasawuf\r\nNafs Marḍiyyah    (النفس المرضية)\tJiwa yang diridhai\tDiridhai Allah karena akhlak, keikhlasan, dan pengabdiannya\tDikembangkan dalam literatur tasawuf (berdasarkan makna QS. Al-Fajr 89:28)\r\nNafs Kāmilah         (النفس الكاملة)  \tJiwa yang sempurna\tAkhlak mulia, ego telah terkendali, hidup untuk memberi manfaat dan mendekat kepada Allah\tKonsep dalam literatur tasawuf, tidak disebut secara eksplisit dalam Al-Qur'an	published	2026-08-23 10:00:48.007+00	2026-08-23 09:42:51.07951+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
fa1a6ddd-8d61-42e3-89e9-e3dd5aa19496	bab92802-31bb-48d8-bd6c-a071fd8b0696	Inside out 1	inside-out-1	tidak ada	Fokus catatan: hubungan antara rasa/emosi, pikiran, respons, penerimaan, dan kesadaran diri.\r\n<br>1. Inside Out 1 – Mengenali dan Menerima Rasa\r\n<br><br>Catatan Utama Inside Out 1\r\n<br>Perubahan terbesar terjadi pada cara Joy memahami Sadness.\r\n<br>Pada awalnya pola yang muncul adalah: Bahagia = baik → Sedih = buruk → sedih harus dihilangkan.\r\n<br>Pada akhirnya Joy memahami bahwa Sadness juga memiliki fungsi. Kesedihan Riley membuat orang tuanya mengetahui apa yang sebenarnya ia rasakan; dari situ muncul kedekatan, rasa aman, dan kelegaan.\r\n<br>•\tProses yang dapat dicatat: Rasa → disadari → diterima → diungkapkan → diproses.\r\n<br>•\tBukan: Rasa tidak nyaman → ditolak → ditekan → dianggap salah.	published	2026-08-24 14:23:40.216+00	2026-08-23 10:09:45.814231+00	2026-08-31 11:33:33.974477+00	{"rows": [["Riley pindah dari Minnesota ke San Francisco", "Sedih, takut, kecewa", "Riley kehilangan rumah, teman, dan kehidupan yang familiar.", "Perubahan keadaan dapat memunculkan rasa tidak nyaman. Rasa tersebut wajar sebagai respons terhadap pengalaman."], ["Joy selalu berusaha membuat Riley bahagia", "Bahagia", "Joy menganggap Riley seharusnya terus bahagia dan berusaha menjauhkan Sadness.", "Kita sering ingin mempertahankan rasa menyenangkan dan menolak rasa yang tidak menyenangkan."], ["Sadness menyentuh core memory\\tSedih", "Sedih\\tkenangan Riley.", "Joy menganggap Sadness merusak kenangan Riley.", "Satu pengalaman tidak selalu memiliki satu rasa. Kenangan bahagia pun dapat mengandung kesedihan."], ["Riley marah kepada orang tuanya\\tMarah", "Marah", "Anger mengambil kendali ketika Riley merasa tertekan.", "Marah dapat menjadi sinyal bahwa ada sesuatu di dalam diri yang sedang tidak nyaman."], ["Riley kehilangan minat terhadap hal yang biasanya disukai", "Hampa / Sedih", "Islands of Personality mulai runtuh.", "Ketika rasa tidak dikenali dan diproses, pengaruhnya dapat menjalar ke perilaku dan hubungan."], ["Bing Bong kehilangan roketnya", "Sedih", "Joy mencoba menghibur, tetapi tidak berhasil. Sadness duduk menemani dan mendengarkannya.", "Tidak semua kesedihan membutuhkan solusi. Kadang seseorang membutuhkan ruang untuk merasakan dan diterima."], ["Riley memutuskan kabur", "Marah, takut, hampa", "Sistem emosinya semakin kacau.", "Tindakan dapat muncul dari rangkaian rasa dan pikiran yang tidak disadari."], ["Riley akhirnya menangis kepada orang tuanya", "Sedih, Lega, Aman", "Riley mengakui bahwa ia merindukan kehidupan lamanya.", "Ketika rasa diakui dan diungkapkan, hubungan dengan orang lain justru dapat menjadi lebih dekat."], ["Core memory baru memiliki lebih dari satu warna", "Campuran Emosi", "Riley tidak lagi mengalami pengalaman secara hitam-putih.", "Kedewasaan emosional berarti mampu menampung beberapa rasa sekaligus."]], "headers": ["Adegan/Kondisi", "Rasa/Emosi", "Yang Terjadi", "Makna"]}	bab92802-31bb-48d8-bd6c-a071fd8b0696/715f81e5-a56d-4be2-95f5-7a965baf69b3.pdf	makna_spiritual_inside_out_1_dan_2_tabel.pdf	application/pdf	74189	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
78d61706-9f6e-4a05-930d-b5fac2e882c6	bab92802-31bb-48d8-bd6c-a071fd8b0696	Inside out 2	inside-out-2	Tidak ada	2. Inside Out 2 – Rasa, Pikiran, dan Identitas Diri\r\nRiley memasuki masa remaja dan mengalami emosi yang semakin kompleks: Anxiety (kecemasan), Envy (iri/keinginan), Embarrassment (malu), dan Ennui (bosan/apatis).\r\nAdegan/Kondisi\tRasa\tMakna\r\nRiley mengetahui teman-temannya akan berbeda sekolah\tCemas, takut kehilangan\tKecemasan muncul ketika pikiran mulai membayangkan masa depan yang belum terjadi.\r\nRiley ingin diterima oleh kelompok Val\tIngin diterima, iri, cemas\tRasa dapat memengaruhi cara kita menilai diri sendiri dan orang lain.\r\nAnxiety mengambil alih Headquarters\tCemas\tAnxiety ingin melindungi Riley dengan mempersiapkan berbagai kemungkinan buruk.\r\nAnxiety menciptakan berbagai skenario masa depan\tTakut/cemas\tPikiran dapat memperbesar rasa dengan membuat skenario mengenai sesuatu yang belum terjadi.\r\nRiley mulai menjauh dari dirinya yang sebelumnya\tTidak aman\tKeinginan diterima orang lain dapat membuat seseorang mengubah perilakunya.\r\nRiley terlalu keras berusaha menjadi pemain yang baik\tCemas, ambisius\tKetika rasa takut tidak cukup baik mendominasi, tindakan dapat berubah menjadi usaha berlebihan untuk membuktikan diri.\r\nRiley mengalami panic attack\tKecemasan ekstrem\tKeinginan Anxiety untuk melindungi Riley menjadi berlebihan dan mengambil kendali.\r\nSemua emosi akhirnya menerima Riley secara utuh\tPenerimaan\tDiri manusia tidak hanya tersusun dari pengalaman atau rasa yang dianggap positif.\r\n\r\nCatatan Utama Inside Out 2\r\nAnxiety sebenarnya bukan musuh Riley. Ia ingin melindungi Riley. Masalah muncul ketika rasa cemas mengambil alih seluruh diri dan respons Riley.\r\n“Aku sedang merasa cemas” berbeda dengan “Aku adalah orang yang selalu cemas.”\r\nKalimat pertama memberikan ruang antara diri yang menyadari dan rasa yang sedang hadir.\r\n3. Hubungan Inside Out dengan Modul “Rasa”\r\nA. Semua rasa mempunyai fungsi\r\n•\tFear → membantu mengenali bahaya.\r\n•\tAnger → memberi sinyal adanya sesuatu yang dianggap tidak adil/tidak sesuai.\r\n•\tDisgust → membantu menghindari sesuatu yang tidak baik.\r\n•\tSadness → membantu mengakui kehilangan dan memperoleh dukungan.\r\n•\tAnxiety → membantu mengantisipasi masa depan.\r\nPersoalan muncul ketika satu rasa mendominasi seluruh respons kita.\r\nB. Rasa tidak sama dengan tindakan\r\n•\tKita boleh merasakan marah tanpa harus menyakiti.\r\n•\tKita boleh merasa takut tanpa selalu menghindar.\r\n•\tKita boleh merasa sedih tanpa menganggap hidup buruk.\r\n•\tKita boleh merasa cemas tanpa mengikuti semua skenario yang dibuat pikiran.\r\nAlur yang dapat diamati: Peristiwa → Rasa → Pikiran → Dorongan → Respons. Di antara dorongan dan respons terdapat kesempatan untuk menyadari apa yang sedang terjadi.\r\nC. Rasa tidak selalu perlu segera diubah\r\nAdegan Bing Bong menunjukkan bahwa Sadness tidak buru-buru mengubah kesedihan menjadi kebahagiaan. Ia memberi ruang, menemani, dan mendengarkan. Setelah kesedihannya mendapat tempat, Bing Bong dapat melanjutkan perjalanan.\r\nMerasakan ≠ tenggelam dalam rasa. Menerima rasa dapat menjadi bagian dari proses melewatinya.\r\n4. Perbedaan Pelajaran Inside Out 1 dan 2\r\nInside Out 1\tInside Out 2\r\nBelajar mengenali rasa\tBelajar tidak dikuasai rasa\r\nSedih tidak harus dihindari\tCemas tidak harus dipercaya sepenuhnya\r\nSemua emosi memiliki fungsi\tEmosi dapat memengaruhi keyakinan tentang diri\r\nMenerima kesedihan\tMenerima kompleksitas diri\r\nTidak harus selalu bahagia\tTidak harus selalu menjadi “cukup baik”\r\nRasa perlu diberi ruang\tRasa perlu disadari tanpa mengambil alih seluruh diri	published	2026-08-23 10:14:29.467+00	2026-08-23 10:14:30.627353+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
b7f222ff-2771-4c89-a498-8b7247146096	e25d89c7-6868-4b6d-a815-b89190af1660	Misi Jiwa	misi-jiwa	Tidak ada	Misi jiwa : untuk satu snapsot kehidupan ini saya harus ngapain sih (battle) dan misi roh : membongkar botol dan pulang pada Tuhan (war)\r\n\r\nKalau dilihat dari cara kamu memaknai hidup, kamu sedang membedakan dua lapisan perjalanan:\r\n\r\n“Battle” → pertarungan harian dalam satu kehidupan sekarang (snapshot kehidupan manusia saat ini).\r\n“War” → perjalanan jiwa yang lebih panjang dan dalam, tentang asal-usul, penyucian, dan kembali kepada Tuhan.\r\n\r\nCara pandang seperti ini banyak muncul dalam tradisi spiritual, tasawuf, filsafat Timur, sampai psikologi transpersonal. Tapi penting juga untuk melihatnya dengan tenang dan membumi, supaya tidak membuat hidup terasa terlalu berat atau seperti harus “menyelamatkan dunia”.\r\n\r\nKalau diterjemahkan sederhana:\r\n1. Misi kehidupan saat ini (“battle”)\r\n\r\nBiasanya berkaitan dengan:\r\n\r\nbelajar menjadi versi diri yang lebih sadar,\r\nmenyembuhkan pola lama,\r\nmembangun karakter,\r\nmelayani dengan kemampuan yang kamu punya,\r\ndan tetap hidup seimbang di dunia nyata.\r\n\r\nDari obrolan-obrolanmu sebelumnya, pola energinya sering mengarah ke:\r\n\r\npencarian makna,\r\npelayanan,\r\nperlindungan,\r\nketertarikan pada penyembuhan batin/spiritual,\r\ndan keinginan membuat sesuatu lebih aman atau lebih baik untuk orang lain.\r\n\r\nMenariknya, itu juga nyambung dengan pekerjaan dan fokusmu di bidang keamanan siber/CSIRT — secara simbolik kamu memang sering berada di jalur:\r\n\r\n“menjaga, mendeteksi, merespons, melindungi.”\r\n\r\nKadang misi hidup bukan sesuatu yang megah.\r\nKadang hanya:\r\n\r\nmenjaga integritas,\r\nmembantu orang dengan tulus,\r\ntidak menjadi sumber luka,\r\ndan tetap sadar di tengah dunia yang kacau.\r\n2. Misi roh (“war”)\r\n\r\nKalau memakai bahasa spiritual yang kamu gunakan:\r\n\r\n“membongkar botol dan pulang kepada Tuhan”\r\n\r\n“Botol” bisa dimaknai sebagai:\r\n\r\nego,\r\nidentitas palsu,\r\ntrauma,\r\nketakutan,\r\nketerikatan dunia,\r\natau semua lapisan yang membuat manusia lupa asalnya.\r\n\r\nSedangkan “pulang kepada Tuhan” bukan berarti ingin cepat meninggalkan dunia.\r\nLebih ke:\r\n\r\nkembali sadar,\r\nhidup lebih jernih,\r\nlebih selaras,\r\nlebih penuh kasih,\r\ndan tidak terpisah dari nilai-nilai ketuhanan.\r\n\r\nDalam banyak ajaran spiritual, “perang terbesar” bukan melawan orang lain, tapi:\r\n\r\nmelawan kesombongan,\r\nluka batin yang mengeras,\r\nrasa takut,\r\nkemarahan,\r\ndan dorongan menghancurkan diri sendiri.\r\n\r\nJadi “war”-nya sering sangat sunyi dan internal.\r\n\r\nKadang orang yang sangat mencari makna hidup bisa merasa:\r\n\r\n“Aku harus menemukan tugas besar.”\r\n\r\nPadahal bisa jadi jiwa justru sedang belajar:\r\n\r\nhadir penuh,\r\nhidup sederhana,\r\nmencintai tanpa kehilangan diri,\r\ndan tetap bertumbuh tanpa lari dari realita.\r\n\r\nBoleh mendalami spiritualitas, tapi tetap penting:\r\n\r\ntidur cukup,\r\nmenjaga tubuh,\r\nbekerja,\r\npunya relasi sehat,\r\ndan berpijak di kenyataan sehari-hari.\r\n\r\nKarena banyak tradisi bijak percaya:\r\n\r\njalan menuju Tuhan justru terlihat dari cara kita menjalani hidup biasa dengan sadar.	published	2026-08-23 10:38:18.878+00	2026-08-23 10:37:59.017249+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
72ab0256-d4c4-4d5e-b638-3518b4911f76	4925cf05-3543-4cea-a74c-3e98f564d84f	Jenis Reinkarnasi	jenis-reinkarnasi	Jenis Reinkarnasi	<div><span>2 jenis reinkarnasi&nbsp;</span></div><div><span>1. sempurna (mengulang Kembali perjalanan jiwa dari 0 dari benda mati, batu, besi, biota laut dll butuh Waktu perjalanan 4.5 Milyar tahun)&nbsp; dan&nbsp;</span></div><div><span>2. tidak sempurna (mengulang kehidupan saja)</span></div><div><span><br></span></div><div><span>amarah - awanah - mutmainnah&nbsp;</span></div><div><span><br></span></div><div><span>jadi manusia - kesempatan langka nunggunya 4,5 milyar tahun.&nbsp;</span></div><div><span><br></span></div><div><span><br></span></div><div><span>3 alasan lahir lagi jadi manusia</span></div><div><span>1. hutang yang belum terbayarkan&nbsp;</span></div><div><span>&nbsp; &nbsp;(termasuk hutang budi) terima kasih semoga Allah membalas mu dengan balasan terbaik jadi kita punya hutang ke dia. QS 4 : 86</span></div><div><span><br></span></div><div><span>Apabila kamu dihormati dengan suatu penghormatan maka balaslah penghormatan itu dengan yang lebih baik atau balaslah dengan yang serupa. Sesungguhnya Allah memperhitungkan segala sesuatu.&nbsp;</span></div><div><span><br></span></div><div><span>QS An-Nisa ayat 86</span></div><div><span><br></span></div><div><span>"Apabila kamu dihormati dengan suatu penghormatan, maka balaslah penghormatan itu dengan yang lebih baik daripadanya, atau balaslah penghormatan itu (dengan yang serupa). Sesungguhnya Allah memperhitungkan segala sesuatu."</span></div><div><span><br></span></div><div><span>kami telah menentukan kematian diantara kamu dan kami sekali-kali tidak dapat dikalahkan. Untuk menggantikan kamu dengan orang-orang seperti kamu dalam dunia, dan menciptakan kamu kelak di akhirat dalam keadaan yang tidak kamu ketahui.</span></div><div><span><br></span></div><div><span>surat 72:26</span></div><div><span>Dia adalah Tuhan yang mengetahui yang ghoib maka dia tidak memperlihatkan kepada seorangpun tentang yang ghoib itu. Kecuali pada rasul yang diridhoinya maka sesungguhnya dia mengadakan penjagaan-penjaga di muka dan dibelakangnya.&nbsp;</span></div><div><span><br></span></div><div><span>masa lalu ghoib (sesuatu yang tidak terjangkau panca indera)</span></div><div><span>masa datang ghoib</span></div><div><span>masa kini nyata.&nbsp;</span></div><div><span><br></span></div><div><span>jiwa-jiwa yang sudah menyatu sama Allah tidak ada ruang dan Waktu. Masa lalu dan masa depan sama saja dan tidak boleh ember.&nbsp;</span></div><div><span><br></span></div><div><span>2. doa/harapan/obsesi yang belum terlaksana/terwujud&nbsp;</span></div><div><span>3. Tugas/Tanggungjawab yang belum selesai&nbsp;</span></div><div><span><br></span></div><div><span>Al-Baqaroh ayat 2-5</span></div><div><span>alif biasa kan lah&nbsp;</span></div><div><span><br></span></div><div><span>kiamat itu transisi dari hidup sebelumnya dan setelah nya&nbsp;</span></div><div><span><br></span></div><div><span>99 proses transisi jiwa</span></div><div><span><br></span></div><div><span>kehidupan akhirat : kehidupan setelah kematian dan kebangkitan yang pertama sampai kehidupan setelah kematian dan kebangkitan yang berikutnya proses kematian dan kebangkitan ini berjalan terus menerus selama ada langit bumi.&nbsp;</span></div><div><span><br></span></div><div><span>mengapa diciptakan jiwa karena jiwa akan mengisi langit bumi.&nbsp;</span></div><div><span><br></span></div><div><span>referensi 8:7</span></div><div><span><br></span></div><div><span>Kamilah - Jiwa yang sempurna&nbsp;</span></div><div><span>Mardiah - Jiwa Diridhai&nbsp;</span></div><div><span>Rodiah - Jiwa yang rela menerima apapun</span></div><div><span>Mutmainnah - Jiwa yang sudah stabil (dipuji tidak lupa diri, dicaci tidak lupa diri (cacian dan makian dimata dia sama)</span></div><div><span>Marhammah - jiwa yang dirahmati</span></div><div><span>lawammah - Jiwa yang menyesal&nbsp;</span></div><div><span>amarah - Jiwa yang marah</span></div><div><span><br></span></div><div><span>31:27&nbsp;</span></div><div><span>18:64</span></div><div><span>23:96</span></div><div><span><br></span></div><div><span>adam itu label manusia yang bertanformasi dari purba ke moderm dan berpikir menjadi khalifah.&nbsp;</span></div><div><span><br></span></div><div><span>bersahabat dengan ketidak nyamanan.&nbsp;</span></div><div><br></div>	published	2026-08-24 11:55:27.096+00	2026-08-24 11:55:12.728337+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
65de4eb1-5fba-48d8-a817-fc9cbf5d0a6f	4925cf05-3543-4cea-a74c-3e98f564d84f	Reinkarnasi	reinkarnasi	Reinkarnasi	<span>Bismillah</span>	published	2026-08-24 11:58:41.692+00	2026-08-24 11:58:28.663588+00	2026-08-31 11:33:33.974477+00	{}	4925cf05-3543-4cea-a74c-3e98f564d84f/7cbc1367-811f-4b7f-a8d5-0c926a10c372.pdf	Reinkarnasi Menurut Al-Qur'an.pdf	application/pdf	464361	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
58699a5f-ba63-437d-9c65-0627eb159079	4925cf05-3543-4cea-a74c-3e98f564d84f	Shalat	shalat	Shalat	<span>Shalat</span>	published	2026-08-24 11:59:15.293+00	2026-08-24 11:59:15.488586+00	2026-08-31 11:33:33.974477+00	{}	4925cf05-3543-4cea-a74c-3e98f564d84f/2b4569ff-e248-471f-9be6-e728a9b13923.pdf	panduan shalat.pdf	application/pdf	329676	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
1812451c-f7ee-4ca1-8170-80ec7529d2d8	4925cf05-3543-4cea-a74c-3e98f564d84f	Percobaan	percobaan	Percobaan	<span>Percobaan</span>	published	2026-08-24 12:36:28.183+00	2026-08-24 12:36:28.30434+00	2026-08-31 11:33:33.974477+00	{}	4925cf05-3543-4cea-a74c-3e98f564d84f/0995a544-7b98-45ef-8707-967320ab3a1c.png	og-jalan-pulang.png	image/png	665247	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
276d85e8-1531-49be-bdd6-4fc3751a4858	e25d89c7-6868-4b6d-a815-b89190af1660	Makrifat	makrifat	Makrifat	<span>Makrifat</span>	published	2026-08-24 14:38:18.548+00	2026-08-24 14:38:19.103439+00	2026-08-31 11:33:33.974477+00	{}	e25d89c7-6868-4b6d-a815-b89190af1660/1aadabe9-1b61-4e60-b84a-a642f2b2cdcb.pdf	makrifat.pdf	application/pdf	228932	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
71b5abbd-eff5-4fcd-abdc-5c948f5e8b50	f7214c2d-bbdb-48d4-bb2e-b8789ba21ba5	Salah Bersyukur	salah-bersyukur	6 Point Salah Bersyukur	<span>1. Menggunakan kata syukur dalam konteks negatif&nbsp;</span><div><span>2. Bersyukur dengan rasa yang kurang tepat</span></div><div><span>3. Hanya mensyukuri hal besar yang dianggap pantas di syukuri</span></div><div><span>4. Hanya mensyukuri hal besar yang sesuai harapan</span></div><div><span>5. Bersyukur dengan membandingkan</span></div><div><span>6. Mengganggap syukur sebagai alat tukar&nbsp;</span></div>	published	2026-08-24 11:53:18.554+00	2026-08-24 11:52:02.605916+00	2026-08-31 11:33:33.974477+00	{"rows": [["1", "Menggunakan kata syukur dalam konteks negatif", "“Syukurlah dia gagal, biar tahu rasa.” / “Alhamdulillah dia kena masalah juga.”", "Kata syukur dipakai untuk menikmati kesulitan atau penderitaan orang lain."], ["2", "Bersyukur dengan rasa yang kurang tepat", "“Aku bersyukur sih dapat pekerjaan ini, tapi kok cuma segini gajinya.”", "Mengucapkan syukur, tetapi batin masih didominasi keluhan, kecewa, atau penolakan terhadap apa yang diterima."], ["3", "Hanya mensyukuri hal besar yang dianggap pantas di syukuri", "“Nanti kalau sudah punya rumah sendiri baru aku benar-benar bersyukur.” Padahal hari ini masih bisa makan, tidur dengan aman, bernapas, dan bertemu orang yang disayangi.", "Syukur menjadi terbatas pada pencapaian besar sehingga nikmat kecil sehari-hari tidak disadari"], ["4", "Hanya mensyukuri hal besar yang sesuai harapan", "“Aku akan bersyukur kalau diterima di kampus yang aku mau.” Ketika diterima di kampus lain yang ternyata baik, ia tetap merasa tidak ada yang perlu disyukuri.", "Sesuatu dianggap nikmat hanya ketika bentuknya sama dengan keinginan kita."], ["5", "Bersyukur dengan membandingkan", "“Aku bersyukur rumahku masih bagus, lihat saja rumah dia lebih jelek.” / “Syukurlah gajiku masih lebih besar daripada dia.”", "Rasa cukup muncul karena merasa lebih beruntung atau lebih tinggi daripada orang lain, bukan karena menyadari nikmat itu sendiri"], ["6", "Mengganggap syukur sebagai alat tukar", "“Aku sudah rajin bersyukur, kok rezekiku belum bertambah?” / “Katanya kalau bersyukur nikmat ditambah, aku sudah bersyukur tapi kenapa keinginanku belum dikabulkan?”", "Syukur menjadi transaksi: aku bersyukur supaya mendapatkan sesuatu, bukan penerimaan dan pengakuan atas nikmat yang sudah ada."]], "headers": ["No", "Bentuk Syukur yang Kurang Tepat", "Contoh", "Kenapa kurang tepat"]}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
f9e65575-8692-4d0e-a396-f5315fda518a	b54920a9-8d70-4331-8ff9-6188933628b9	Kungfu Panda 1	kungfu-panda-1	Tidak ada	<span>Lalalalla</span>	draft	\N	2026-08-23 13:50:58.09931+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
4c825a30-6846-4dcc-b873-772c2ddb2589	4925cf05-3543-4cea-a74c-3e98f564d84f	Makna Al-Fatihah	makna-al-fatihah	Belum ada	<span>Lalalala<span>&nbsp;lalalala&nbsp;</span></span>	published	2026-08-23 14:52:44.879+00	2026-08-23 14:38:20.815754+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
d7d56263-0b29-486f-b21d-e20bac43236b	f7214c2d-bbdb-48d4-bb2e-b8789ba21ba5	Syukur Sejati Kurikulum	syukur-sejati-kurikulum	-	-	published	2026-08-29 08:08:50.306+00	2026-08-29 06:44:37.925269+00	2026-08-31 11:33:33.974477+00	{"rows": [["Modul 1", "Salah Bersyukur"], ["Modul 2", "Percaya Sykur"], ["Modul 3", "Andalkan Syukur"], ["Modul 4", "Pahala dan Dosa"], ["Modul 5", "Kudengar SuaraMU didalam hatiku"], ["Modul 6", "Meditasi Jiwa"], ["Modul 7", "Jiwa Bersyukur"], ["Modul 8", "SPA Syukur Jiwa"], ["Modul 9", "Sadar sebagai jiwa"], ["Modul 10", "Bersyukur jiwa kembali"], ["Modul 11", "Mencintai dengan Jiwa"], ["Modul 12", "Jiwa Mencintai Tuhan"], ["Modul 13", "Jiwa Merasakan Energi Kehidupan"], ["Modul 14", "Ikatan Jiwa"], ["Modul 15", "Jiwa Terhubung dengan Percikan Tuhan"], ["Modul 16", "Percaya padaKu"], ["Modul 17", "Jiwa Berbahagia"], ["Modul 18", "Jiwa dan Otak Menjadi Satu"], ["Modul 19", "Hati"], ["Modul 20", "Menyadari aku Secara Utuh dan Nyata"], ["Modul 21", "Percikan Tuhan dan Jiwa Menjadi Satu"], ["Modul 22", "Jiwa Mengikuti Percikan Tuhan"], ["Modul 23", "Memilih Aku"], ["Modul 24", "Percaya pada Pilihanmu"], ["Modul 25", "Kembali Padaku"]], "headers": ["No", "Nama"]}	f7214c2d-bbdb-48d4-bb2e-b8789ba21ba5/a64d5828-302d-4878-9d95-69197beb40f3.jpg	IMG_20260422_141340_280.jpg	image/jpeg	144939	1a7b0f9b-4023-4c71-9f8f-ce280372607e	\N	\N
34ac64f4-f606-4156-b4c4-d5ab71590d57	e25d89c7-6868-4b6d-a815-b89190af1660	Level Amarah	level-amarah	Tidak ada	Level jiwaKondisi batinCiri dalam kehidupan sehari-hariHubungan dengan rasa<span>:</span><div><span><br></span><div><strong>1. Nafs Ammarah</strong>Jiwa yang dikuasai dorongan/nafsuMudah bereaksi, menyalahkan, ingin menang, mengikuti keinginan tanpa banyak kesadaran<strong>Rasa mengendalikan tindakan</strong>: marah → langsung membentak</div><div><strong>2. Nafs Lawwamah</strong>Jiwa yang mulai menyadari diriSetelah bereaksi mulai menyesal, mengevaluasi diri, sadar ada yang perlu diperbaiki<strong>Mulai mengamati rasa</strong>: “Tadi aku marah dan seharusnya tidak berkata begitu.”</div><div><strong>3. Nafs Mulhamah</strong>Jiwa yang mendapat ilham menuju kebaikanMulai mampu membedakan dorongan ego dengan tindakan yang lebih baik<strong>Mendengarkan rasa tanpa langsung menurutinya</strong></div><div><strong>4. Nafs Mutmainnah</strong>Jiwa yang tenteramLebih tenang menghadapi keadaan, tidak mudah diguncang sesuatu yang tidak sesuai keinginan<strong>Rasa hadir, tetapi tidak mengambil alih diri</strong></div><div><strong>5. Nafs Radiyah</strong>Jiwa yang ridhaMenerima ketetapan Allah tanpa terus berperang dengan kenyataan<strong>Menerima rasa sekaligus menerima kenyataan</strong></div><div><strong>6. Nafs Mardhiyyah</strong>Jiwa yang diridhaiKehendak dan perilaku semakin selaras dengan kebaikan dan ketaatan kepada Allah<strong>Respons tidak lagi berpusat pada ego</strong></div><div><strong>7. Nafs Kamilah</strong>Istilah tasawuf untuk jiwa yang mencapai kematangan spiritualKesadaran, akhlak, kasih, dan penghambaan semakin matang<strong>Rasa tetap ada sebagai manusia, tetapi diolah dengan kesadaran yang sangat dalam</strong></div></div>	published	2026-08-31 11:11:17.414+00	2026-08-23 10:39:34.479054+00	2026-08-31 11:33:33.974477+00	{}	\N	\N	\N	\N	1a7b0f9b-4023-4c71-9f8f-ce280372607e	1a7b0f9b-4023-4c71-9f8f-ce280372607e	1a7b0f9b-4023-4c71-9f8f-ce280372607e
\.


--
-- Data for Name: content_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_folders (id, section, title, slug, description, is_published, sort_order, created_at, updated_at) FROM stdin;
af2332eb-2a7c-43da-a53c-41e8c60546a4	ruang-belajar	Shalat	shalat	Makna Shalat, Wudhu, Puasa, dll	t	100	2026-08-23 06:52:03.16791+00	2026-08-23 10:02:05.861544+00
bab92802-31bb-48d8-bd6c-a071fd8b0696	sinopsis	Inside out	inside-out	Perjalanan jiwa film Inside out 1 & 2	t	100	2026-08-23 10:07:58.449824+00	2026-08-23 10:07:58.449824+00
b54920a9-8d70-4331-8ff9-6188933628b9	sinopsis	Kungfu Panda	kungfu-panda	Spiritual journey pada film kungfu panda 1, 2, 3 dan 4	t	100	2026-08-23 10:11:40.349811+00	2026-08-23 10:11:40.349811+00
e25d89c7-6868-4b6d-a815-b89190af1660	ruang-belajar	Pengetahuan Umum	pengetahuan-umum	Pengetahuan Umum	t	100	2026-08-23 07:03:58.749064+00	2026-08-23 10:28:45.85883+00
8e1c6b7d-d252-4712-a0c1-3f096bf0a40d	ruang-belajar	Rest Area 89	rest-area-89	Rest Area 89 oleh Kang Abu dan Kang Anjrit	t	100	2026-08-24 02:31:23.002654+00	2026-08-24 02:31:23.002654+00
4925cf05-3543-4cea-a74c-3e98f564d84f	ruang-belajar	Tafsir	tafsir	Memahami Al-Qur'an bersama Kang Abu Marlo dan Kang IIP	t	100	2026-08-23 14:37:30.095394+00	2026-08-24 02:31:51.272066+00
73c7450b-dc2d-4174-9fee-2db8dd97957c	ruang-belajar	3 Fakir	3-fakir	3 Fakir bersama Kang Abu, Bang Soni dan Bang Dame	t	100	2026-08-24 02:32:14.766898+00	2026-08-24 02:32:14.766898+00
ef82f442-6adb-4619-83ef-00487b086993	ruang-belajar	Larena Selfhelp	larena-selfhelp	Pembelajaran dari kak larena	t	100	2026-08-26 14:16:44.494311+00	2026-08-26 14:16:44.494311+00
b3b7a039-6262-4cd7-b2b8-d9a1f38e3ac5	layanan	Refleksi	refleksi	Refleksi	t	100	2026-08-29 06:40:09.652491+00	2026-08-29 06:40:09.652491+00
f7214c2d-bbdb-48d4-bb2e-b8789ba21ba5	ruang-belajar	Syukur Sejati Class	syukur-sejati-class	Kelas syukur sejati bersama dr surya https://sbs-syukursejati.or.id/ \r\n \r\n📱081110551444\r\n📩 syukurbhuwanasemesta@gmail.com\r\n😊@perjalananwaktu.sbs	t	100	2026-08-24 02:21:11.174672+00	2026-08-29 06:52:55.853209+00
\.


--
-- Data for Name: page_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_content (page_key, eyebrow, title, description, updated_at, created_at) FROM stdin;
ruang-belajar	ruang belajar	Belajar melalui perjalanan.	Kumpulan kajian, refleksi, dan pembelajaran yang dapat dibuka satu per satu sesuai perjalanan yang sedang ingin dipahami.	2026-08-23 12:12:10.220421+00	2026-08-24 03:52:07.910182+00
perjalanan	perjalanan	Setiap perjalanan membawa kita lebih dekat pada kesadaran	Ruang untuk menyusuri pengalaman, refleksi, dan proses kehidupan. Bukan tentang seberapa jauh kita berjalan, tetapi tentang apa yang kita sadari sepanjang perjalanan.	2026-08-23 14:35:17.634931+00	2026-08-24 03:52:07.910182+00
tentang	tentang	Setiap orang punya jalannya sendiri	<p><strong>Jalan Pulang</strong> adalah ruang refleksi untuk memahami rasa, kesadaran, penerimaan, makna, dan perjalanan hidup.</p><p>Tidak semua orang berjalan dengan arah yang sama. Ada yang menemukan jalannya lebih awal, ada yang harus berputar cukup jauh. Ada yang bertumbuh melalui kebahagiaan, ada pula yang mengenal dirinya melalui kehilangan, kegagalan, perubahan, dan berbagai hal yang tidak pernah direncanakan.</p><p>Karena itu, perjalanan hidup tidak selalu tentang seberapa cepat kita sampai. Terkadang, perjalanan justru mengajak kita berhenti sejenak, melihat kembali apa yang telah dilewati, dan menyadari apa yang sebenarnya sedang terjadi di dalam diri.</p>Berhenti sejenak<p>Di tengah kehidupan yang terus bergerak, kita sering terbiasa mengejar sesuatu: pekerjaan, pencapaian, pengakuan, keamanan, hubungan, atau gambaran tentang kehidupan yang kita anggap ideal.</p><p>Tanpa sadar, kita bisa begitu sibuk berjalan hingga lupa bertanya:</p><p><strong>Apakah jalan yang sedang kutempuh masih selaras dengan diriku?</strong></p><p>Berhenti bukan berarti menyerah.</p><p>Berhenti dapat menjadi kesempatan untuk memberi ruang kepada diri sendiri—untuk bernapas, merasakan, mengamati, dan mendengarkan apa yang selama ini tertutup oleh kebisingan.</p>Memberi ruang pada rasa<p>Tidak semua rasa harus segera diperbaiki.</p><p>Ada rasa yang hanya ingin didengar. Ada kesedihan yang membutuhkan waktu. Ada kemarahan yang membawa pesan. Ada ketakutan yang menunjukkan sesuatu yang sedang kita lindungi. Ada pula kebahagiaan sederhana yang sering terlewat karena kita terlalu sibuk memikirkan apa yang belum dimiliki.</p><p>Di Jalan Pulang, rasa tidak dipandang sebagai sesuatu yang harus dilawan.</p><p>Rasa	2026-08-24 03:49:25.531075+00	2026-08-24 03:52:07.910182+00
sinopsis	sinopsis	Cerita yang singgah, makna yang dibawa pulang	Catatan tentang buku, film, dokumenter, dan tontonan yang meninggalkan makna, dilihat melalui perjalanan Jalan Pulang.	2026-08-23 14:34:49.535095+00	2026-08-24 03:52:07.910182+00
artikel	artikel	Catatan sepanjang jalan		2026-08-23 14:34:59.820435+00	2026-08-24 03:52:07.910182+00
kontak	kontak	Terima kasih sudah singgah	Untuk keamanan dan privasi, website ini tidak menggunakan form publik atau pelacak pihak ketiga.	2026-08-23 14:35:08.990154+00	2026-08-24 03:52:07.910182+00
\.


--
-- Data for Name: page_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_views (id, session_id, path, referrer, device_type, created_at) FROM stdin;
1	f3cf96a4-d69c-4394-ac81-9f18ac4555a0	/ruang-belajar/tema/tafsir	http://localhost:3000/ruang-belajar/tema/tafsir	desktop	2026-08-30 13:54:49.820562+00
2	f3cf96a4-d69c-4394-ac81-9f18ac4555a0	/ruang-belajar/tema/tafsir	http://localhost:3000/ruang-belajar/tema/tafsir	desktop	2026-08-30 13:54:49.826437+00
3	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/admin	desktop	2026-08-30 13:55:27.417082+00
4	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/admin	desktop	2026-08-30 13:55:28.150832+00
5	0f324718-53d1-4c06-8d7e-158cd2696855	/	http://localhost:3000/admin	desktop	2026-08-30 13:58:27.633737+00
6	44a3a13a-a2b8-4549-b9ac-920915b56e32	/superadmin	\N	desktop	2026-08-30 14:19:02.29917+00
7	44a3a13a-a2b8-4549-b9ac-920915b56e32	/superadmin	\N	desktop	2026-08-30 14:19:02.585559+00
8	44a3a13a-a2b8-4549-b9ac-920915b56e32	/ruang-belajar	\N	desktop	2026-08-30 14:19:41.497776+00
9	44a3a13a-a2b8-4549-b9ac-920915b56e32	/sinopsis	\N	desktop	2026-08-30 14:19:44.412438+00
10	44a3a13a-a2b8-4549-b9ac-920915b56e32	/artikel	\N	desktop	2026-08-30 14:19:46.532325+00
11	44a3a13a-a2b8-4549-b9ac-920915b56e32	/superadmin	\N	desktop	2026-08-30 14:20:44.685233+00
12	44a3a13a-a2b8-4549-b9ac-920915b56e32	/superadmin	\N	desktop	2026-08-30 14:20:44.708056+00
13	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/superadmin-login/mfa	desktop	2026-08-31 11:03:15.044518+00
14	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/superadmin-login/mfa	desktop	2026-08-31 11:03:15.04192+00
15	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/superadmin-login/mfa	desktop	2026-08-31 11:06:29.210975+00
16	0f324718-53d1-4c06-8d7e-158cd2696855	/ruang-belajar	http://localhost:3000/superadmin-login/mfa	desktop	2026-08-31 11:06:29.226661+00
17	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	\N	desktop	2026-08-31 11:06:36.527752+00
18	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	\N	desktop	2026-08-31 11:06:37.276467+00
19	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	http://localhost:3000/superadmin	desktop	2026-08-31 11:10:39.778592+00
20	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	http://localhost:3000/superadmin	desktop	2026-08-31 11:10:39.807657+00
21	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	http://localhost:3000/superadmin	desktop	2026-08-31 11:16:16.839681+00
22	0f324718-53d1-4c06-8d7e-158cd2696855	/superadmin	http://localhost:3000/superadmin	desktop	2026-08-31 11:16:16.845395+00
23	780087af-f87d-4151-9a49-5050737b2bba	/	http://localhost:3000/reader-login	desktop	2026-08-31 11:25:35.617923+00
24	780087af-f87d-4151-9a49-5050737b2bba	/	http://localhost:3000/reader-login	desktop	2026-08-31 11:25:35.983358+00
25	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar	http://localhost:3000/reader-login	desktop	2026-08-31 11:25:45.281817+00
26	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:25:52.608723+00
27	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:31:51.38082+00
28	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:31:51.704223+00
29	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:34:12.940292+00
30	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:34:13.02516+00
31	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:34:59.69493+00
32	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/reader-login	desktop	2026-08-31 11:35:00.423988+00
33	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:29:28.994245+00
34	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:29:29.583513+00
35	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/ruang-belajar	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:29:31.729665+00
36	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/ruang-belajar/tema/larena-selfhelp	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:29:36.343804+00
37	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/ruang-belajar	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:19.230495+00
38	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/ruang-belajar/tema/3-fakir	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:25.613722+00
39	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/ruang-belajar	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:28.298427+00
40	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:31.473854+00
41	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/perjalanan	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:35.634973+00
42	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/perjalanan/folder/refleksi	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:31:39.268004+00
43	5b5ff6fb-945e-4dec-aec8-7da30c2078c5	/perjalanan	http://localhost:3000/reader-login?next=%2Fruang-belajar	desktop	2026-08-31 13:34:50.077777+00
44	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/ruang-belajar/tema/syukur-sejati-class	desktop	2026-08-31 13:37:07.088722+00
45	780087af-f87d-4151-9a49-5050737b2bba	/ruang-belajar/tema/syukur-sejati-class	http://localhost:3000/ruang-belajar/tema/syukur-sejati-class	desktop	2026-08-31 13:37:07.385738+00
46	780087af-f87d-4151-9a49-5050737b2bba	/	http://localhost:3000/reader-login	desktop	2026-08-31 13:39:32.303123+00
47	780087af-f87d-4151-9a49-5050737b2bba	/perjalanan	http://localhost:3000/reader-login	desktop	2026-08-31 13:39:33.701016+00
48	780087af-f87d-4151-9a49-5050737b2bba	/perjalanan	http://localhost:3000/perjalanan	desktop	2026-08-31 13:48:39.750895+00
49	780087af-f87d-4151-9a49-5050737b2bba	/perjalanan	http://localhost:3000/perjalanan	desktop	2026-08-31 13:48:39.766696+00
50	780087af-f87d-4151-9a49-5050737b2bba	/perjalanan	http://localhost:3000/perjalanan	desktop	2026-08-31 13:53:50.676332+00
51	780087af-f87d-4151-9a49-5050737b2bba	/perjalanan	http://localhost:3000/perjalanan	desktop	2026-08-31 13:53:51.343496+00
52	05e651f1-585f-4fbd-b4ef-2e40f263126d	/ruang-belajar	http://localhost:3000/admin-login	desktop	2026-09-01 13:39:41.794535+00
53	05e651f1-585f-4fbd-b4ef-2e40f263126d	/ruang-belajar	http://localhost:3000/admin-login	desktop	2026-09-01 13:39:42.144355+00
54	05e651f1-585f-4fbd-b4ef-2e40f263126d	/ruang-belajar	http://localhost:3000/admin-login	desktop	2026-09-01 13:41:44.69619+00
55	05e651f1-585f-4fbd-b4ef-2e40f263126d	/ruang-belajar	http://localhost:3000/admin-login	desktop	2026-09-01 13:41:45.423639+00
\.


--
-- Data for Name: reader_active_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reader_active_sessions (user_id, session_hash, created_at, expires_at, last_seen_at) FROM stdin;
58245db3-8a49-4008-8995-f64c507a6afc	3363c04a98ab6d04912448cc87e21cbcc6e5cba11eaf6ba5689650fd5ea87b10	2026-08-30 10:06:58.797+00	2026-08-30 22:06:58.797+00	2026-08-30 10:06:58.797+00
3ffde153-7be5-4603-b094-9b770cf4dd49	fc438b94feb0d426b117816b6821945bb4ed2419b444f51175bf8ca7fca6610a	2026-08-31 13:39:27.717+00	2026-09-01 01:39:27.717+00	2026-08-31 13:39:27.717+00
\.


--
-- Data for Name: reader_email_otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reader_email_otps (id, user_id, otp_hash, expires_at, used_at, created_at) FROM stdin;
32	58245db3-8a49-4008-8995-f64c507a6afc	dd5a23ec7085ab17e8f64472656a6f43ab8b099dc294f1462f9f1d776fa70c30	2026-08-30 10:14:30.718+00	2026-08-30 10:04:49.568+00	2026-08-30 10:04:32.467486+00
34	58245db3-8a49-4008-8995-f64c507a6afc	8e9462e7ab19c50b207d5a0b06823ce61f4e248fe5441d971e4bcee1d3bbcf82	2026-08-30 10:16:43.107+00	2026-08-30 10:06:58.523+00	2026-08-30 10:06:44.467244+00
35	3ffde153-7be5-4603-b094-9b770cf4dd49	7ec06e05dc9eaa50459afe2b1dbbed505cad467ad96e46307fae786f4982315c	2026-08-30 13:49:45.667+00	2026-08-30 13:40:04.696+00	2026-08-30 13:39:48.596659+00
36	3ffde153-7be5-4603-b094-9b770cf4dd49	8bd03f1d76e6a9f6b7b8bcf9f54294dc101e001e7d146e6e4c4c2be2003ae07b	2026-08-31 11:35:06.621+00	2026-08-31 11:25:30.2+00	2026-08-31 11:25:07.413467+00
40	3ffde153-7be5-4603-b094-9b770cf4dd49	15a61bd14ec07babd2992e76ccecab5052d648ba0c7ba6ba9cd7d94f154db775	2026-08-31 13:39:04.197+00	2026-08-31 13:29:23.772+00	2026-08-31 13:29:05.934489+00
43	3ffde153-7be5-4603-b094-9b770cf4dd49	d9177107b51a6e5f02dc6f9d120b3a7ed6f306ad260c04694f925e343b45f1d4	2026-08-31 13:49:04.884+00	2026-08-31 13:39:27.309+00	2026-08-31 13:39:06.01004+00
49	3ffde153-7be5-4603-b094-9b770cf4dd49	3e1eb25bd8de628651518438c5b43aced2118ba65f623aebbc80b89dc06b05b4	2026-09-01 03:20:09.669+00	\N	2026-09-01 03:10:10.832413+00
\.


--
-- Data for Name: reader_login_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reader_login_history (id, user_id, email, reader_name, logged_in_at, device, os, browser) FROM stdin;
1	58245db3-8a49-4008-8995-f64c507a6afc	zeilathursina@gmail.com	Zeila	2026-08-30 10:04:51.194404+00	iPhone	iOS 18.7	Safari 26.6
2	58245db3-8a49-4008-8995-f64c507a6afc	zeilathursina@gmail.com	Zeila	2026-08-30 10:06:59.795823+00	Mac	macOS 10.15.7	Safari 26.6
3	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	Inez	2026-08-30 13:40:07.411774+00	Windows PC	Windows	Microsoft Edge 151.0.0.0
4	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	Inez	2026-08-31 11:25:31.616239+00	Windows PC	Windows	Microsoft Edge 151.0.0.0
5	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	Inez	2026-08-31 13:29:25.397607+00	Windows PC	Windows	Firefox 154.0
6	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	Inez	2026-08-31 13:39:28.893041+00	Windows PC	Windows	Microsoft Edge 151.0.0.0
\.


--
-- Data for Name: reader_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reader_users (id, user_id, email, is_active, created_at, name, status, updated_at) FROM stdin;
32f37745-3212-4cf4-a272-8b5e5ecd2045	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	t	2026-08-27 04:18:00.541243+00	Inez	active	2026-08-27 04:18:21.268849+00
a947e29c-e929-426a-abf6-1c17ab3d9199	58245db3-8a49-4008-8995-f64c507a6afc	zeilathursina@gmail.com	t	2026-08-28 13:32:56.793108+00	Zeila	active	2026-08-28 13:32:56.793108+00
\.


--
-- Data for Name: site_pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_pages (slug, eyebrow, title, lead, body, updated_at) FROM stdin;
tentang	tentang jalan pulang	Setiap orang punya jalannya sendiri.	Jalan Pulang adalah ruang refleksi untuk memahami rasa, perjalanan hidup, penerimaan, makna, dan kesadaran.	“Menjadi nol” bukan berarti kehilangan diri. Ia adalah ajakan untuk berhenti sejenak dari kebisingan agar kita dapat melihat kehidupan dengan lebih jernih.	2026-08-24 02:39:29.992608+00
layanan	layanan	Ruang untuk memulai perjalanan.	Pilih ruang yang paling sesuai dengan apa yang sedang dibutuhkan hari ini.	Pulang ke Diri — refleksi dan pengenalan diri.\r\n\r\nTumbuh Sadar — mindfulness dan kesadaran sehari-hari.\r\n\r\nTemukan Arah — makna, nilai, dan arah hidup.\r\n\r\nHidup Utuh — penerimaan dan integrasi diri.	2026-08-24 02:39:29.992608+00
kontak	kontak	Terima kasih sudah singgah.	Jalan Pulang menjaga ruang ini tetap sederhana dan privacy-first.	Untuk keamanan, jangan menampilkan email login admin di halaman publik. Gunakan alamat email kontak yang terpisah apabila nanti ingin menambahkan kontak publik.	2026-08-24 02:39:29.992608+00
\.


--
-- Data for Name: writer_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.writer_applications (id, user_id, email, full_name, display_name, requested_access, reason, status, reviewed_by, reviewed_at, created_at, updated_at) FROM stdin;
61771984-cba5-4d16-8574-d0c498d1af14	3ffde153-7be5-4603-b094-9b770cf4dd49	inezmatrika@gmail.com	Inez Matrika	Inez	writer	Belajar spiritual	approved	1a7b0f9b-4023-4c71-9f8f-ce280372607e	2026-08-31 13:07:32.219+00	2026-08-31 13:07:13.2661+00	2026-08-31 13:07:32.219+00
\.


--
-- Name: page_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.page_views_id_seq', 55, true);


--
-- Name: reader_email_otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reader_email_otps_id_seq', 49, true);


--
-- Name: reader_login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reader_login_history_id_seq', 6, true);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (user_id);


--
-- Name: content_folder_entries content_folder_entries_folder_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_folder_id_slug_key UNIQUE (folder_id, slug);


--
-- Name: content_folder_entries content_folder_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_pkey PRIMARY KEY (id);


--
-- Name: content_folders content_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folders
    ADD CONSTRAINT content_folders_pkey PRIMARY KEY (id);


--
-- Name: content_folders content_folders_section_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folders
    ADD CONSTRAINT content_folders_section_slug_key UNIQUE (section, slug);


--
-- Name: page_content page_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_content
    ADD CONSTRAINT page_content_pkey PRIMARY KEY (page_key);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: reader_active_sessions reader_active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_active_sessions
    ADD CONSTRAINT reader_active_sessions_pkey PRIMARY KEY (user_id);


--
-- Name: reader_email_otps reader_email_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_email_otps
    ADD CONSTRAINT reader_email_otps_pkey PRIMARY KEY (id);


--
-- Name: reader_login_history reader_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_login_history
    ADD CONSTRAINT reader_login_history_pkey PRIMARY KEY (id);


--
-- Name: reader_users reader_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_users
    ADD CONSTRAINT reader_users_pkey PRIMARY KEY (id);


--
-- Name: reader_users reader_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_users
    ADD CONSTRAINT reader_users_user_id_key UNIQUE (user_id);


--
-- Name: site_pages site_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_pages
    ADD CONSTRAINT site_pages_pkey PRIMARY KEY (slug);


--
-- Name: writer_applications writer_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writer_applications
    ADD CONSTRAINT writer_applications_pkey PRIMARY KEY (id);


--
-- Name: content_folder_entries_author_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_folder_entries_author_id_idx ON public.content_folder_entries USING btree (author_id);


--
-- Name: content_folder_entries_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_folder_entries_published_at_idx ON public.content_folder_entries USING btree (published_at DESC);


--
-- Name: idx_reader_active_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reader_active_sessions_expires_at ON public.reader_active_sessions USING btree (expires_at);


--
-- Name: idx_reader_login_history_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reader_login_history_time ON public.reader_login_history USING btree (logged_in_at DESC);


--
-- Name: idx_reader_login_history_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reader_login_history_user_time ON public.reader_login_history USING btree (user_id, logged_in_at DESC);


--
-- Name: page_views_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_views_created_at_idx ON public.page_views USING btree (created_at DESC);


--
-- Name: page_views_path_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_views_path_created_idx ON public.page_views USING btree (path, created_at DESC);


--
-- Name: page_views_session_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_views_session_created_idx ON public.page_views USING btree (session_id, created_at DESC);


--
-- Name: reader_email_otps_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reader_email_otps_user_idx ON public.reader_email_otps USING btree (user_id);


--
-- Name: reader_users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reader_users_email_idx ON public.reader_users USING btree (lower(email));


--
-- Name: reader_users_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reader_users_email_unique ON public.reader_users USING btree (lower(email));


--
-- Name: reader_users_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reader_users_status_idx ON public.reader_users USING btree (status);


--
-- Name: reader_users_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reader_users_user_id_idx ON public.reader_users USING btree (user_id);


--
-- Name: writer_applications_email_lower_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX writer_applications_email_lower_key ON public.writer_applications USING btree (lower(email));


--
-- Name: writer_applications_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX writer_applications_user_id_key ON public.writer_applications USING btree (user_id);


--
-- Name: content_folder_entries trg_content_folder_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_content_folder_entries_updated_at BEFORE UPDATE ON public.content_folder_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: content_folders trg_content_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_content_folders_updated_at BEFORE UPDATE ON public.content_folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: page_content trg_page_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_page_content_updated_at BEFORE UPDATE ON public.page_content FOR EACH ROW EXECUTE FUNCTION public.set_page_content_updated_at();


--
-- Name: site_pages trg_site_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_site_pages_updated_at BEFORE UPDATE ON public.site_pages FOR EACH ROW EXECUTE FUNCTION public.touch_site_page();


--
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_folder_entries content_folder_entries_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.admin_users(user_id) ON DELETE SET NULL;


--
-- Name: content_folder_entries content_folder_entries_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.content_folders(id) ON DELETE CASCADE;


--
-- Name: content_folder_entries content_folder_entries_last_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_last_published_by_fkey FOREIGN KEY (last_published_by) REFERENCES public.admin_users(user_id) ON DELETE SET NULL;


--
-- Name: content_folder_entries content_folder_entries_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_folder_entries
    ADD CONSTRAINT content_folder_entries_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admin_users(user_id) ON DELETE SET NULL;


--
-- Name: reader_active_sessions reader_active_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_active_sessions
    ADD CONSTRAINT reader_active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reader_email_otps reader_email_otps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_email_otps
    ADD CONSTRAINT reader_email_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reader_login_history reader_login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_login_history
    ADD CONSTRAINT reader_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reader_users reader_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reader_users
    ADD CONSTRAINT reader_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: writer_applications writer_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writer_applications
    ADD CONSTRAINT writer_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: writer_applications writer_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writer_applications
    ADD CONSTRAINT writer_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_folders admin manage content folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manage content folders" ON public.content_folders TO authenticated USING ((public.is_admin() AND (( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text))) WITH CHECK ((public.is_admin() AND (( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text)));


--
-- Name: content_folder_entries admin manage folder entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manage folder entries" ON public.content_folder_entries TO authenticated USING ((public.is_admin() AND (( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text))) WITH CHECK ((public.is_admin() AND (( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text)));


--
-- Name: site_pages admin read site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin read site pages" ON public.site_pages FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: site_pages admin update site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin update site pages" ON public.site_pages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: content_folder_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_folder_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: content_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: site_pages mfa required site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mfa required site pages" ON public.site_pages AS RESTRICTIVE TO authenticated USING ((( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text)) WITH CHECK ((( SELECT (auth.jwt() ->> 'aal'::text)) = 'aal2'::text));


--
-- Name: page_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

--
-- Name: page_content page_content_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY page_content_admin_insert ON public.page_content FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: page_content page_content_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY page_content_admin_update ON public.page_content FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: page_content page_content_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY page_content_public_read ON public.page_content FOR SELECT TO authenticated, anon USING (true);


--
-- Name: page_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

--
-- Name: content_folders public read content folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read content folders" ON public.content_folders FOR SELECT TO authenticated, anon USING ((is_published = true));


--
-- Name: content_folder_entries public read folder entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read folder entries" ON public.content_folder_entries FOR SELECT TO authenticated, anon USING (((status = 'published'::text) AND (published_at IS NOT NULL)));


--
-- Name: site_pages public read site pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read site pages" ON public.site_pages FOR SELECT TO anon USING (true);


--
-- Name: reader_users reader can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reader can insert own profile" ON public.reader_users FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: reader_users reader can read own access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reader can read own access" ON public.reader_users FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: reader_users reader can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reader can read own profile" ON public.reader_users FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: reader_users reader can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reader can update own profile" ON public.reader_users FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: reader_active_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reader_active_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: reader_email_otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reader_email_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: reader_login_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reader_login_history ENABLE ROW LEVEL SECURITY;

--
-- Name: reader_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reader_users ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users self admin membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "self admin membership" ON public.admin_users FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: site_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: writer_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.writer_applications ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict BRPFZeY2XWLNuhZ049GapClRCFSiR31La3pMLgR5f6R0Ic3avOvhfGsWyi36o2K

