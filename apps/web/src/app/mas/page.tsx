'use client';
import { ListGroup, ListRow, ScreenHeader, Section } from '@/components/ui';

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Más" subtitle="Tu oración, tu Biblia y tus ajustes en un solo lugar." />

      <Section title="Mi oración">
        <ListGroup>
          <ListRow title="Mis rutinas" detail="Plan de oración y recordatorios" href="/rutinas/" />
          <ListRow title="Historial del Rosario" detail="Rosarios rezados" href="/rosario/historial/" />
          <ListRow title="Oraciones favoritas" detail="Las que más rezas" href="/orar/" />
        </ListGroup>
      </Section>

      <Section title="Biblia">
        <ListGroup>
          <ListRow title="Marcadores" detail="Versículos guardados y notas" href="/marcadores/" />
          <ListRow title="Buscar" detail="En el texto bíblico y en las oraciones" href="/buscar/" />
          <ListRow title="Comparar versiones" detail="Lectura en paralelo" href="/comparar/" />
          <ListRow title="Hoy" detail="Lecturas y versículo del día" href="/hoy/" />
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
          <ListRow title="Acerca de Libre Biblia" detail="Código abierto, sin cuenta, todo en tu dispositivo" href="/fuentes/" />
        </ListGroup>
      </Section>
    </div>
  );
}
