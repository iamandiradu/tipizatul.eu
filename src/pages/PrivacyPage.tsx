import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export default function PrivacyPage() {
  useDocumentMeta({
    title: 'Confidențialitate — Tipizatul.eu',
    description:
      'Ce date colectează Tipizatul.eu (aproape niciuna), unde locuiesc, și care sunt drepturile tale conform GDPR.',
    canonical: 'https://tipizatul.eu/confidentialitate',
  })

  return (
    <article className="max-w-3xl mx-auto py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Înapoi la pagina principală
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        Confidențialitate
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
        Ultima actualizare: 4 mai 2026
      </p>

      <div className="space-y-10 text-base leading-relaxed text-gray-700 dark:text-gray-300">
        {/* TL;DR */}
        <section className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-6">
          <h2 className="text-sm font-mono uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-3">
            Pe scurt
          </h2>
          <p className="text-gray-800 dark:text-gray-200">
            Tipizatul.eu nu folosește cookie-uri de marketing, nu rulează analytics
            și nu împărtășește date cu terți. <strong>Datele pe care le completezi
            într-un formular nu părăsesc niciodată browserul tău</strong> — sunt
            procesate local și descărcate ca PDF.
          </p>
        </section>

        {/* În browser */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ce rămâne în browserul tău
          </h2>
          <p className="mb-4">
            Informații stocate <strong>doar pe dispozitivul tău</strong>, niciodată trimise pe vreun server:
          </p>
          <ul className="space-y-3 list-disc pl-6">
            <li>
              <strong>Datele completate în formulare</strong> (nume, CNP, adresă etc.)
              — păstrate în <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">sessionStorage</code> cât timp tab-ul rămâne deschis,
              ca să nu pierzi progresul când navighezi între pagini. Se șterg automat când închizi tab-ul.
            </li>
            <li>
              <strong>Catalogul de formulare</strong> — o copie locală a listei de formulare,
              ca să se încarce instant la următoarea vizită.
            </li>
            <li>
              <strong>Preferința pentru modul întunecat / luminos</strong>.
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Poți șterge oricând aceste date din setările browserului
            (Setări → Confidențialitate → Șterge datele site-ului).
          </p>
        </section>

        {/* Pe servere */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ce stocăm pe servere
          </h2>
          <p className="mb-4">
            Informații care ajung pe Firestore (Google Cloud, regiune UE):
          </p>
          <ul className="space-y-3 list-disc pl-6">
            <li>
              <strong>Voturi</strong> (👍 / 👎 + comentariu opțional). Pentru a împiedica spam-ul, fiecare
              browser primește un identificator unic generat aleatoriu (UUID) salvat în{' '}
              <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">localStorage</code>.
              Acest UUID este trimis odată cu votul, ca să nu poți vota de mai multe ori același formular
              de pe același dispozitiv. Nu te identifică personal — e doar un șir de caractere generat în browserul tău.
            </li>
            <li>
              <strong>Propuneri</strong> trimise prin butonul „Propune". Conțin titlul și descrierea pe care le-ai scris.
            </li>
            <li>
              <strong>Conturi de administrator</strong> (adresa de e-mail Google) — doar pentru utilizatorii
              cu drepturi de administrare a catalogului. Utilizatorii obișnuiți nu au și nu fac cont.
            </li>
          </ul>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Cookie-uri
          </h2>
          <p className="mb-3">
            Tipizatul.eu <strong>nu setează cookie-uri</strong> pentru tracking, marketing sau analytics.
            Nu există Google Analytics, Meta Pixel, Hotjar sau echivalent. Singurele identificatoare
            locale sunt cele descrise mai sus, toate strict tehnice.
          </p>
          <p>
            Pentru administratori, autentificarea cu Google folosește cookie-uri și IndexedDB gestionate
            de Firebase Auth — strict necesare pentru sesiunea de administrare.
          </p>
        </section>

        {/* Temei legal */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Temeiul legal
          </h2>
          <p className="mb-3">
            Conform GDPR (Regulamentul (UE) 2016/679) și Legii 506/2004:
          </p>
          <ul className="space-y-2 list-disc pl-6">
            <li>
              <strong>Datele din formulare</strong> rămân pe dispozitivul tău — nu există prelucrare pe server.
            </li>
            <li>
              <strong>Voturile, propunerile și UUID-ul de dispozitiv</strong> sunt prelucrate pe baza{' '}
              <em>interesului legitim</em> (Art. 6(1)(f) GDPR) — funcționarea catalogului și prevenirea abuzului.
            </li>
            <li>
              <strong>Conturile de administrator</strong> sunt prelucrate pe baza <em>consimțământului</em>{' '}
              (Art. 6(1)(a) GDPR), exprimat prin autentificarea cu Google.
            </li>
          </ul>
        </section>

        {/* Drepturi */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Drepturile tale
          </h2>
          <p className="mb-3">Conform GDPR ai dreptul să:</p>
          <ul className="space-y-2 list-disc pl-6 mb-4">
            <li>afli ce date stocăm despre tine</li>
            <li>ceri ștergerea sau corectarea lor</li>
            <li>ceri o copie a datelor (portabilitate)</li>
            <li>te opui prelucrării</li>
            <li>
              depui o plângere la <strong>ANSPDCP</strong> —{' '}
              <a
                href="https://www.dataprotection.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                www.dataprotection.ro
              </a>
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pentru a-ți exercita oricare dintre aceste drepturi, scrie-ne la adresa de contact de mai jos.
            Pentru voturi am nevoie de UUID-ul tău de dispozitiv — îl găsești în consola browserului:{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              localStorage.getItem('tipizatul:deviceId')
            </code>.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Contact
          </h2>
          <p>
            Pentru orice întrebare sau cerere legată de date personale:{' '}
            <a
              href="mailto:iamandiradustefan@gmail.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              iamandiradustefan@gmail.com
            </a>{' '}
            sau prin{' '}
            <a
              href="https://github.com/iamandiradu/tipizatul.eu/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              GitHub
            </a>.
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Operator: Radu Iamandi — autor și administrator al proiectului.
          </p>
        </section>

        {/* Modificări */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Modificări
          </h2>
          <p>
            Această notă poate fi actualizată dacă platforma evoluează. Modificările semnificative
            vor fi anunțate pe pagina principală.
          </p>
        </section>
      </div>
    </article>
  )
}
