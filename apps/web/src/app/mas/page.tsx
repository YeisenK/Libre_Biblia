'use client';
import { ROUTE_READY } from '@/components/AppShell';
import { LuxLogo } from '@/components/brand/LuxLogo';
import { ListGroup, ListRow, ScreenHeader, Section } from '@/components/ui';

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Mi espacio" subtitle="Tus favoritos, tu oración, tus descargas y tus ajustes en un solo lugar." />

      <Section title="Favoritos y marcadores">
        <ListGroup>
          <ListRow title="Oraciones favoritas" detail="Las que más rezas" href="/orar/" />
          <ListRow title="Marcadores" detail="Versículos guardados y notas" href="/marcadores/" />
        </ListGroup>
      </Section>

      <Section title="Mi oración">
        <ListGroup>
          <ListRow title="Mis rutinas" detail="Plan de oración y recordatorios" href="/rutinas/" />
          <ListRow title="Historial del Rosario" detail="Rosarios rezados" href="/rosario/historial/" />
          <ListRow title="Mi diario" detail="Reflexiones e intenciones, solo para ti" href="/diario/" />
        </ListGroup>
      </Section>

      <Section title="Biblia">
        <ListGroup>
          <ListRow title="Buscar" detail="En el texto bíblico y en las oraciones" href="/buscar/" />
          <ListRow title="Comparar versiones" detail="Lectura en paralelo" href="/comparar/" />
          <ListRow title="Hoy" detail="Lecturas y versículo del día" href="/hoy/" />
          {ROUTE_READY['/calendario/'] && <ListRow title="Calendario" detail="Fiestas, santos y tiempos litúrgicos" href="/calendario/" />}
          <ListRow title="Santoral" detail="Vidas de los santos, por mes" href="/santo/" />
          {ROUTE_READY['/formacion/'] && <ListRow title="Formación" detail="Catecismo, documentos de la Iglesia e itinerarios" href="/formacion/" />}
          <ListRow title="Oración de las Horas" detail="Laudes, Vísperas, Completas…" href="/horas/" />
        </ListGroup>
      </Section>

      <Section title="Contenido">
        <ListGroup>
          <ListRow title="Descargas" detail="Biblias, obras y paquetes" href="/descargas/" />
          <ListRow title="Fuentes y licencias" detail="Procedencia de cada texto" href="/fuentes/" />
        </ListGroup>
      </Section>

      <Section title="Aplicación">
        <ListGroup>
          <ListRow title="Ajustes" detail="Apariencia, lectura, oración y copia de seguridad" href="/ajustes/" />
          <ListRow title="Acerca de Lux" detail="Código abierto, sin cuenta, todo en tu dispositivo" href="/fuentes/" />
        </ListGroup>
      </Section>

      <p className="mt-2 flex items-center justify-center gap-2 pb-2 text-[12px] text-muted">
        <LuxLogo size={16} showName={false} className="text-muted" /> Lux · «Yo soy la luz del mundo» (Jn 8,12)
      </p>
    </div>
  );
}
