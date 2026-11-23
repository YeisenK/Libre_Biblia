// Arte sacro de dominio público (Wikimedia Commons). Ver docs/DISENO_V2.md («Arte»).
// El bloque entre los marcadores GENERADO lo escribe `node tools/art/fetch-art.mjs`; no editar a mano.

export interface Art {
  src: string;
  title: string;
  artist: string;
  year?: string;
  sourceUrl: string;
  license: string;
  /** object-position CSS, p. ej. '50% 30%' */
  focus?: string;
}

interface ArtEntry extends Art {
  keys: string[];
}

// <GENERADO>
const ENTRIES: ArtEntry[] = [
  {
    "keys": [
      "mystery:joyful-1"
    ],
    "src": "/art/mystery-joyful-1.webp",
    "title": "La Anunciación",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1660",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_anunciaci%C3%B3n_(Murillo,_h._1660).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:joyful-2"
    ],
    "src": "/art/mystery-joyful-2.webp",
    "title": "La Visitación",
    "artist": "Rogier van der Weyden",
    "year": "1435-1440",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rogier_van_der_Weyden_-_Visitation_-_WGA25716.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "mystery:joyful-3",
      "set:joyful"
    ],
    "src": "/art/mystery-joyful-3.webp",
    "title": "La Adoración de los pastores",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Adoraci%C3%B3n_de_los_pastores_(Murillo).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "mystery:joyful-4"
    ],
    "src": "/art/mystery-joyful-4.webp",
    "title": "La Presentación en el Templo",
    "artist": "Fra Angelico",
    "year": "h. 1440-1442",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fra_Angelico_-_Presentation_of_Jesus_in_the_Temple_(Cell_10)_-_WGA00544.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "mystery:joyful-5"
    ],
    "src": "/art/mystery-joyful-5.webp",
    "title": "Jesús entre los doctores",
    "artist": "Alberto Durero",
    "year": "1506",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_Jesus_among_the_Doctors_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:luminous-1"
    ],
    "src": "/art/mystery-luminous-1.webp",
    "title": "El Bautismo de Cristo",
    "artist": "El Greco",
    "year": "1596-1600",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_bautismo_de_Cristo_(El_Greco,_1597).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:luminous-2"
    ],
    "src": "/art/mystery-luminous-2.webp",
    "title": "Las bodas de Caná",
    "artist": "Pablo Veronés",
    "year": "1563",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Veronese,_The_Marriage_at_Cana_(1563).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "mystery:luminous-3"
    ],
    "src": "/art/mystery-luminous-3.webp",
    "title": "El Sermón de la Montaña",
    "artist": "Carl Heinrich Bloch",
    "year": "1877",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "mystery:luminous-4",
      "set:luminous"
    ],
    "src": "/art/mystery-luminous-4.webp",
    "title": "La Transfiguración",
    "artist": "Rafael Sanzio",
    "year": "1516-1520",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Transfiguration_Raphael.jpg",
    "license": "Public domain",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "mystery:luminous-5"
    ],
    "src": "/art/mystery-luminous-5.webp",
    "title": "La Última Cena",
    "artist": "Juan de Juanes",
    "year": "h. 1562",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_%C3%9Altima_Cena_(Juan_de_Juanes)_(restaurada).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "mystery:sorrowful-1",
      "prayer:hagase-tu-voluntad"
    ],
    "src": "/art/mystery-sorrowful-1.webp",
    "title": "La Oración en el huerto",
    "artist": "El Greco",
    "year": "1600-1607",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_-_Jes%C3%BAs_en_el_Huerto_de_los_Olivos,_1600-1607.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:sorrowful-2"
    ],
    "src": "/art/mystery-sorrowful-2.webp",
    "title": "La Flagelación de Cristo",
    "artist": "Caravaggio",
    "year": "1607",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_Flagellation_of_Christ-Caravaggio_(1607).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "mystery:sorrowful-3"
    ],
    "src": "/art/mystery-sorrowful-3.webp",
    "title": "La Coronación de espinas",
    "artist": "José de Ribera",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ribera_-_La_Coronaci%C3%B3n_de_espinas,_D005984.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:sorrowful-4"
    ],
    "src": "/art/mystery-sorrowful-4.webp",
    "title": "Cristo con la cruz a cuestas",
    "artist": "El Greco",
    "year": "h. 1590-1595",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_-_Christ_Carrying_the_Cross_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:sorrowful-5",
      "set:sorrowful"
    ],
    "src": "/art/mystery-sorrowful-5.webp",
    "title": "Cristo crucificado",
    "artist": "Diego Velázquez",
    "year": "1631-1632",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cristo_crucificado.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:glorious-1"
    ],
    "src": "/art/mystery-glorious-1.webp",
    "title": "La Resurrección del Señor",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1650-1660",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bartolom%C3%A9_Esteban_Murillo_-_Resurrecci%C3%B3n_del_Se%C3%B1or_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "mystery:glorious-2"
    ],
    "src": "/art/mystery-glorious-2.webp",
    "title": "La Ascensión",
    "artist": "Juan de Flandes",
    "year": "1514-1519",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_Ascensi%C3%B3n,_de_Juan_de_Flandes_(Museo_del_Prado).jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "mystery:glorious-3",
      "category:espiritu-santo",
      "prayer:veni-creator"
    ],
    "src": "/art/mystery-glorious-3.webp",
    "title": "Pentecostés",
    "artist": "El Greco",
    "year": "h. 1600",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Pentecost%C3%A9s_(El_Greco,_c._1600)_Prado.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:glorious-4"
    ],
    "src": "/art/mystery-glorious-4.webp",
    "title": "La Asunción de la Virgen",
    "artist": "El Greco",
    "year": "1577-1579",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Domenikos_Theotok%C3%B3poulos,_called_El_Greco_-_The_Assumption_of_the_Virgin_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "mystery:glorious-5",
      "set:glorious"
    ],
    "src": "/art/mystery-glorious-5.webp",
    "title": "La Coronación de la Virgen",
    "artist": "Diego Velázquez",
    "year": "h. 1635-1636",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Diego_Vel%C3%A1zquez_-_Coronation_of_the_Virgin_-_Prado.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:inmaculada-concepcion",
      "home:default"
    ],
    "src": "/art/novena-inmaculada-concepcion.webp",
    "title": "La Inmaculada Concepción de Soult",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1678",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Murillo_-_Inmaculada_Concepci%C3%B3n_de_los_Venerables_o_de_Soult_(Museo_del_Prado,_1678).jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "novena:virgen-del-rosario"
    ],
    "src": "/art/novena-virgen-del-rosario.webp",
    "title": "La Virgen del Rosario",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Virgen_del_Rosario_(Murillo).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:angel-de-la-guarda"
    ],
    "src": "/art/novena-angel-de-la-guarda.webp",
    "title": "El Ángel de la Guarda",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1665",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lienzo_del_altar_del_%C3%81ngel_de_la_Guarda_(Catedral_de_Sevilla).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:cristo-rey"
    ],
    "src": "/art/novena-cristo-rey.webp",
    "title": "Cristo bendiciendo (El Salvador del mundo)",
    "artist": "El Greco",
    "year": "h. 1600",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_(Domenikos_Theotokopoulos)_-_Christ_Blessing_(%27The_Saviour_of_the_World%27)_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "novena:nino-jesus",
      "prayer:salmo-23"
    ],
    "src": "/art/novena-nino-jesus.webp",
    "title": "El Buen Pastor (Niño Jesús)",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1660",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:BuenPastorMurillo1660.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:sagrado-corazon",
      "prayer:consagracion-sagrado-corazon"
    ],
    "src": "/art/novena-sagrado-corazon.webp",
    "title": "El Sagrado Corazón de Jesús",
    "artist": "Pompeo Batoni",
    "year": "1767",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:SacredHeartBatoni.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:san-antonio-de-padua"
    ],
    "src": "/art/novena-san-antonio-de-padua.webp",
    "title": "La visión de san Antonio de Padua",
    "artist": "Bartolomé Esteban Murillo",
    "year": "1656",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_visi%C3%B3n_de_San_Antonio,_de_Bartolom%C3%A9_Esteban_Murillo_(Capilla_de_San_Antonio_de_la_catedral_de_Sevilla).jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "novena:san-benito"
    ],
    "src": "/art/novena-san-benito.webp",
    "title": "San Benito (Retablo de Perusa)",
    "artist": "Fra Angelico",
    "year": "h. 1438",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Angelico_-_Perugia_Altarpiece_%E2%80%93_Saint_Benedict_and_Peter_the_Martyr.jpg",
    "license": "Public domain",
    "focus": "30% 40%"
  },
  {
    "keys": [
      "novena:san-francisco-de-asis",
      "category:santos"
    ],
    "src": "/art/novena-san-francisco-de-asis.webp",
    "title": "San Francisco de Asís en éxtasis",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1635-1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Francisco_de_Zurbar%C3%A1n_-_San_francisco_de_As%C3%ADs_en_%C3%A9xtasis.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:san-gabriel-arcangel"
    ],
    "src": "/art/novena-san-gabriel-arcangel.webp",
    "title": "La Anunciación (arcángel san Gabriel)",
    "artist": "Fra Angelico",
    "year": "h. 1426",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Angelico,_prado.jpg",
    "license": "Public domain",
    "focus": "25% 45%"
  },
  {
    "keys": [
      "novena:san-jose"
    ],
    "src": "/art/novena-san-jose.webp",
    "title": "San José con el Niño",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1670-1675",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Murillo-san_jose_con_el_ni%C3%B1o.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "category:familia"
    ],
    "src": "/art/category-familia.webp",
    "title": "La Sagrada Familia del pajarito",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sagrada_Familia_del_pajarito_(Murillo).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "novena:san-juan-diego"
    ],
    "src": "/art/novena-san-juan-diego.webp",
    "title": "Retablo de la Virgen de Guadalupe con san Juan Diego",
    "artist": "Miguel Cabrera",
    "year": "1751",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Miguel_Cabrera_-_Altarpiece_of_the_Virgin_of_Guadalupe_with_Saint_John_the_Baptist,_Fray_Juan_de_Zum%C3%A1rraga_and_Juan_Diego_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:san-judas-tadeo"
    ],
    "src": "/art/novena-san-judas-tadeo.webp",
    "title": "San Judas Tadeo",
    "artist": "José de Ribera",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ribera_-_San_Judas_Tadeo,_P001092.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "novena:san-miguel-arcangel",
      "category:proteccion"
    ],
    "src": "/art/novena-san-miguel-arcangel.webp",
    "title": "San Miguel Arcángel derrota a Satanás",
    "artist": "Guido Reni",
    "year": "1636",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:GuidoReni_MichaelDefeatsSatan.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:san-rafael-arcangel"
    ],
    "src": "/art/novena-san-rafael-arcangel.webp",
    "title": "Tobías y el ángel (san Rafael)",
    "artist": "Taller de Verrocchio",
    "year": "h. 1470-1475",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Verrocchio_workshop_-_Tobias_and_the_Angel_-_NG.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:santa-rosa-de-lima"
    ],
    "src": "/art/novena-santa-rosa-de-lima.webp",
    "title": "Santa Rosa de Lima",
    "artist": "Claudio Coello",
    "year": "1683",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sta_Rosa_de_Lima_por_Claudio_Coello.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:santa-teresita"
    ],
    "src": "/art/novena-santa-teresita.webp",
    "title": "Santa Teresa de Lisieux",
    "artist": "Fotografía anónima",
    "year": "1895",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Teresa-de-Lisieux.jpg",
    "license": "Public domain",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "novena:virgen-del-carmen"
    ],
    "src": "/art/novena-virgen-del-carmen.webp",
    "title": "La Virgen del Carmen con santa Teresa y san Juan de la Cruz",
    "artist": "Juan Rodríguez Juárez",
    "year": "h. 1700",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_Rodr%C3%ADguez_Ju%C3%A1rez_-_The_Virgin_of_the_Carmen_with_Saint_Theresa_and_Saint_John_of_the_Cross_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:virgen-del-pilar"
    ],
    "src": "/art/novena-virgen-del-pilar.webp",
    "title": "La venida de la Virgen del Pilar a Zaragoza (boceto)",
    "artist": "Francisco de Goya",
    "year": "s. XVIII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Venida_de_la_Virgen_del_Pilar_a_Zaragoza_(boceto)_por_Francisco_de_Goya.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:por-los-difuntos",
      "category:difuntos"
    ],
    "src": "/art/novena-por-los-difuntos.webp",
    "title": "In ictu oculi",
    "artist": "Juan de Valdés Leal",
    "year": "1672",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_de_Vald%C3%A9s_Leal_-_In_Ictu_Oculi_-_WGA24214.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:lourdes"
    ],
    "src": "/art/novena-lourdes.webp",
    "title": "Nuestra Señora de Lourdes",
    "artist": "Virgilio Tojetti",
    "year": "1877",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Virgilio_Tojetti_1877_Our_Lady_of_Lourdes.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:guadalupe"
    ],
    "src": "/art/novena-guadalupe.webp",
    "title": "Nuestra Señora de Guadalupe (imagen de la tilma)",
    "artist": "Anónimo",
    "year": "s. XVI",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Virgen_de_Guadalupe_mirando_de_frente.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:perpetuo-socorro"
    ],
    "src": "/art/novena-perpetuo-socorro.webp",
    "title": "Nuestra Señora del Perpetuo Socorro",
    "artist": "Icono de tradición bizantino-cretense",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Nuestra_Se%C3%B1ora_del_Perpetuo_Socorro.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "category:latin"
    ],
    "src": "/art/category-latin.webp",
    "title": "San Jerónimo escribiendo",
    "artist": "Caravaggio",
    "year": "1605-1606",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Saint_Jerome_Writing-Caravaggio_(1605-6).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "moment:morning",
      "prayer:oracion-de-la-manana"
    ],
    "src": "/art/moment-morning.webp",
    "title": "Amanecer",
    "artist": "Claudio de Lorena",
    "year": "1646-1647",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Amanecer,_1646%E2%80%9347,_Claude_Lorrain.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "moment:midday"
    ],
    "src": "/art/moment-midday.webp",
    "title": "Campo de trigo con cipreses",
    "artist": "Vincent van Gogh",
    "year": "1889",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Wheat_Field_with_Cypresses_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "moment:afternoon",
      "prayer:angelus"
    ],
    "src": "/art/moment-afternoon.webp",
    "title": "El Ángelus",
    "artist": "Jean-François Millet",
    "year": "1857-1859",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jean-Fran%C3%A7ois_Millet_-_The_Angelus_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "moment:night"
    ],
    "src": "/art/moment-night.webp",
    "title": "La noche estrellada",
    "artist": "Vincent van Gogh",
    "year": "1889",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:fundamentales"
    ],
    "src": "/art/category-fundamentales.webp",
    "title": "Agnus Dei (el Cordero de Dios)",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1635-1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Agnus_Dei_Zurbar%C3%A1n.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:manana"
    ],
    "src": "/art/category-manana.webp",
    "title": "La Aurora",
    "artist": "Guido Reni",
    "year": "1614",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Guido_Reni_-_Aurora_-_WGA19273.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:tarde"
    ],
    "src": "/art/category-tarde.webp",
    "title": "El sembrador al atardecer",
    "artist": "Vincent van Gogh",
    "year": "1888",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Le_Semeur_dans_un_champ_de_bl%C3%A9_au_soleil_couchant_(1888).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:noche"
    ],
    "src": "/art/category-noche.webp",
    "title": "Salida de la luna sobre el mar",
    "artist": "Caspar David Friedrich",
    "year": "1822",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Mondaufgang_am_Meer_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:comida"
    ],
    "src": "/art/category-comida.webp",
    "title": "San Hugo en el refectorio de los cartujos",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1655",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:San_Hugo_en_el_refectorio_de_los_cartujos.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:virgen-maria",
      "prayer:letania-lauretana"
    ],
    "src": "/art/category-virgen-maria.webp",
    "title": "La Madonna Sixtina",
    "artist": "Rafael Sanzio",
    "year": "1512",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raphael_-_The_Sistine_Madonna_-_Google_Arts_%26_Culture.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "category:angeles"
    ],
    "src": "/art/category-angeles.webp",
    "title": "Ángeles músicos",
    "artist": "Hans Memling",
    "year": "h. 1480",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Hans_Memling_-_Christ_with_Singing_and_Music-Making_Angels_-_KMSKA_778-780.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:novenas"
    ],
    "src": "/art/category-novenas.webp",
    "title": "La Virgen niña en oración",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1660",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Zurbar%C3%A1n,_Francisco_de_-_The_Childhood_of_the_Virgin.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "category:accion-de-gracias"
    ],
    "src": "/art/category-accion-de-gracias.webp",
    "title": "La Coronación de la Virgen",
    "artist": "Fra Angelico",
    "year": "h. 1430-1435",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Coronation_of_the_Virgin_-_Fra_Angelico_-_Louvre.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:momentos-dificiles",
      "prayer:oracion-en-tiempos-de-dificultad"
    ],
    "src": "/art/category-momentos-dificiles.webp",
    "title": "Cristo en la tormenta del mar de Galilea",
    "artist": "Rembrandt",
    "year": "1633",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "category:rosarios-coronillas"
    ],
    "src": "/art/category-rosarios-coronillas.webp",
    "title": "La fiesta del Rosario",
    "artist": "Alberto Durero",
    "year": "1506",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_Feast_of_Rose_Garlands_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "category:devociones"
    ],
    "src": "/art/category-devociones.webp",
    "title": "La Disputa del Santísimo Sacramento",
    "artist": "Rafael Sanzio",
    "year": "1509-1510",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Disputa_del_Sacramento_(Rafael).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "category:liturgia-horas"
    ],
    "src": "/art/category-liturgia-horas.webp",
    "title": "Las muy ricas horas del duque de Berry",
    "artist": "Hermanos de Limbourg",
    "year": "h. 1412-1416",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Les_Tr%C3%A8s_Riches_Heures_du_duc_de_Berry_-_Janvier.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "category:sacramentos"
    ],
    "src": "/art/category-sacramentos.webp",
    "title": "La institución de la Eucaristía",
    "artist": "Fra Angelico",
    "year": "h. 1442",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fra_Angelico_-_Institution_of_the_Eucharist_(Cell_35)_-_WGA00549.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "novena:preciosa-sangre"
    ],
    "src": "/art/novena-preciosa-sangre.webp",
    "title": "La Crucifixión (Retablo de Isenheim)",
    "artist": "Matthias Grünewald",
    "year": "h. 1512-1516",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_WGA10723.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "novena:divina-misericordia",
      "prayer:coronilla-divina-misericordia"
    ],
    "src": "/art/novena-divina-misericordia.webp",
    "title": "El regreso del hijo pródigo",
    "artist": "Rembrandt",
    "year": "h. 1669",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_-_The_Return_of_the_Prodigal_Son_-_WGA19133.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:espiritu-santo",
      "prayer:ven-espiritu-santo"
    ],
    "src": "/art/novena-espiritu-santo.webp",
    "title": "Pentecostés",
    "artist": "Tiziano",
    "year": "1546",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Tiziano_Pentecost%C3%A9s.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:fatima",
      "prayer:oracion-fatima"
    ],
    "src": "/art/novena-fatima.webp",
    "title": "La Virgen del Rosario",
    "artist": "Sassoferrato",
    "year": "h. 1643",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fotoreproductie_van_schilderij_Madonna_del_Rosario_door_Sassoferrato_in_de_S._Sabina_te_Rome,_RP-F-1993-7-32.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "novena:san-martin-de-porres"
    ],
    "src": "/art/novena-san-martin-de-porres.webp",
    "title": "San Diego de Alcalá, hermano lego",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1646",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bartolome_murillo-diego_de_alcala.JPG",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:senal-de-la-cruz"
    ],
    "src": "/art/prayer-senal-de-la-cruz.webp",
    "title": "Cristo crucificado",
    "artist": "Francisco de Zurbarán",
    "year": "1627",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Francisco_de_Zurbar%C3%A1n_-_Crucifixion_-_The_Art_Institute_of_Chicago.jpg",
    "license": "Public domain",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "prayer:padre-nuestro"
    ],
    "src": "/art/prayer-padre-nuestro.webp",
    "title": "El Padre Nuestro",
    "artist": "James Tissot",
    "year": "h. 1890",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Brooklyn_Museum_-_The_Lord%27s_Prayer_(Le_Pater_Noster)_-_James_Tissot.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:ave-maria"
    ],
    "src": "/art/prayer-ave-maria.webp",
    "title": "La Anunciación",
    "artist": "El Greco",
    "year": "1597-1600",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_-_The_Annunciation_(Anunciacion)_Prado_1597-1600.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:gloria"
    ],
    "src": "/art/prayer-gloria.webp",
    "title": "La Santísima Trinidad",
    "artist": "El Greco",
    "year": "1577-1579",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_Trinidad_(El_Greco,_1577-1579).jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:credo-apostoles"
    ],
    "src": "/art/prayer-credo-apostoles.webp",
    "title": "Los cuatro apóstoles",
    "artist": "Alberto Durero",
    "year": "1526",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_The_Four_Apostles,_Saints_John,_Peter,_Mark_and_Paul.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:credo-niceno"
    ],
    "src": "/art/prayer-credo-niceno.webp",
    "title": "El Concilio de Nicea",
    "artist": "Miguel Damaskinos",
    "year": "s. XVI",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:First_Council_of_Nicaea_Michael_Damaskinos.png",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:acto-de-fe"
    ],
    "src": "/art/prayer-acto-de-fe.webp",
    "title": "La incredulidad de santo Tomás",
    "artist": "Caravaggio",
    "year": "1601-1602",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_Incredulity_of_Saint_Thomas.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:acto-de-esperanza"
    ],
    "src": "/art/prayer-acto-de-esperanza.webp",
    "title": "La Esperanza",
    "artist": "George Frederic Watts",
    "year": "1886",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Assistants_and_George_Frederic_Watts_-_Hope_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:acto-de-caridad"
    ],
    "src": "/art/prayer-acto-de-caridad.webp",
    "title": "Santa Isabel de Hungría curando a los tiñosos",
    "artist": "Bartolomé Esteban Murillo",
    "year": "1672",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Santa_Isabel_de_Hungr%C3%ADa_curando_ti%C3%B1osos..jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:acto-de-adoracion"
    ],
    "src": "/art/prayer-acto-de-adoracion.webp",
    "title": "La adoración del Cordero místico",
    "artist": "Jan van Eyck",
    "year": "1432",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ghent_Altarpiece_D_-_Adoration_of_the_Lamb_1.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:ofrecimiento-del-dia"
    ],
    "src": "/art/prayer-ofrecimiento-del-dia.webp",
    "title": "El Niño Jesús dormido sobre la cruz",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1670",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Ni%C3%B1o_Jes%C3%BAs_dormido_sobre_la_cruz,_de_Bartolom%C3%A9_Esteban_Murillo_(Museo_del_Prado).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:regina-coeli"
    ],
    "src": "/art/prayer-regina-coeli.webp",
    "title": "La Resurrección",
    "artist": "Piero della Francesca",
    "year": "h. 1460",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Piero_della_Francesca_-_Resurrection_-_WGA17609.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:angel-de-la-guarda"
    ],
    "src": "/art/prayer-angel-de-la-guarda.webp",
    "title": "El Ángel custodio",
    "artist": "Guercino",
    "year": "1641",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Guercino,_Angelo_custode,_Pinacoteca_civica_(Fano)_25.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:consagracion-a-maria"
    ],
    "src": "/art/prayer-consagracion-a-maria.webp",
    "title": "La Virgen de los Navegantes",
    "artist": "Alejo Fernández",
    "year": "h. 1531-1536",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fernandez-Virgin_of_the_Navigators_(proper_inversion).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:pausa-del-mediodia"
    ],
    "src": "/art/prayer-pausa-del-mediodia.webp",
    "title": "La siesta",
    "artist": "Vincent van Gogh",
    "year": "1890",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Noon_%E2%80%93_Rest_from_Work_(after_Millet).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:examen-breve"
    ],
    "src": "/art/prayer-examen-breve.webp",
    "title": "El filósofo en meditación",
    "artist": "Rembrandt",
    "year": "1632",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_-_The_Philosopher_in_Meditation_(cleaned).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:accion-de-gracias-del-dia"
    ],
    "src": "/art/prayer-accion-de-gracias-del-dia.webp",
    "title": "La Adoración de los Magos",
    "artist": "Pedro Pablo Rubens",
    "year": "1624",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_The_Adoration_of_the_Magi_-_WGA20244.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:hora-de-la-misericordia"
    ],
    "src": "/art/prayer-hora-de-la-misericordia.webp",
    "title": "Cristo con la cruz a cuestas",
    "artist": "Tiziano",
    "year": "h. 1565",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Titian,_Christ_Carrying_the_Cross._Oil_on_canvas,_67_x_77_cm,_c._1565._Madrid,_Museo_Nacional_del_Prado.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:oracion-de-la-noche"
    ],
    "src": "/art/prayer-oracion-de-la-noche.webp",
    "title": "La Magdalena de la llama humeante",
    "artist": "Georges de La Tour",
    "year": "h. 1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_Tour_-_La_Madeleine_%C3%A0_la_veilleuse_dite_La_Madeleine_Terff,_vers_1642_-_1644,_RF_1949_11.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:examen-de-conciencia"
    ],
    "src": "/art/prayer-examen-de-conciencia.webp",
    "title": "La Magdalena penitente",
    "artist": "Georges de La Tour",
    "year": "h. 1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_Penitent_Magdalen_MET_DT7252.jpg",
    "license": "CC0",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:acto-de-contricion"
    ],
    "src": "/art/prayer-acto-de-contricion.webp",
    "title": "El regreso del hijo pródigo",
    "artist": "Bartolomé Esteban Murillo",
    "year": "1667-1670",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Return_of_the_Prodigal_Son_1667-1670_Murillo.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:visita-senor-esta-habitacion"
    ],
    "src": "/art/prayer-visita-senor-esta-habitacion.webp",
    "title": "Luna naciente sobre el mar",
    "artist": "Caspar David Friedrich",
    "year": "1822",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Moonrise_by_the_Sea_-_WGA08266.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:en-tus-manos"
    ],
    "src": "/art/prayer-en-tus-manos.webp",
    "title": "Cristo en la cruz",
    "artist": "Francisco de Goya",
    "year": "1780",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cristo_en_la_cruz_(Goya).jpg",
    "license": "Public domain",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "prayer:nunc-dimittis"
    ],
    "src": "/art/prayer-nunc-dimittis.webp",
    "title": "Simeón en el Templo",
    "artist": "Rembrandt",
    "year": "1627-1628",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_Simeon_and_Anna_in_the_Temple@Kunsthalle_Hamburg.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:salve"
    ],
    "src": "/art/prayer-salve.webp",
    "title": "La Virgen de la Servilleta",
    "artist": "Bartolomé Esteban Murillo",
    "year": "1665-1666",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Virgen_de_la_servilleta,_Bartolom%C3%A9_Esteban_Murillo.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:jesus-jose-y-maria"
    ],
    "src": "/art/prayer-jesus-jose-y-maria.webp",
    "title": "La Sagrada Familia con ángeles",
    "artist": "Rembrandt",
    "year": "1645",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_-_The_Holy_Family_with_Angels_-_WGA19128.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:completas"
    ],
    "src": "/art/prayer-completas.webp",
    "title": "Joaquín entre los pastores",
    "artist": "Giotto",
    "year": "h. 1305",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Giotto_02._Joachim_among_the_Shepherds_-_Capella_degli_Scrovegni_Padua.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:bendicion-mesa"
    ],
    "src": "/art/prayer-bendicion-mesa.webp",
    "title": "La cena de Emaús",
    "artist": "Caravaggio",
    "year": "1601",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Supper_at_Emmaus-Caravaggio_(1601).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:accion-de-gracias-comida"
    ],
    "src": "/art/prayer-accion-de-gracias-comida.webp",
    "title": "La multiplicación de los panes y los peces",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1670",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Milagro_de_la_multiplicaci%C3%B3n_de_los_panes_y_los_peces.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:veni-sancte-spiritus"
    ],
    "src": "/art/prayer-veni-sancte-spiritus.webp",
    "title": "Pentecostés",
    "artist": "Jean II Restout",
    "year": "1732",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Restout_-_La_Pentec%C3%B4te_01.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:siete-dones"
    ],
    "src": "/art/prayer-siete-dones.webp",
    "title": "El Bautismo de Cristo",
    "artist": "Verrocchio y Leonardo da Vinci",
    "year": "h. 1475",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Andrea_del_Verrocchio,_Leonardo_da_Vinci_-_Baptism_of_Christ_-_Uffizi.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:bajo-tu-amparo"
    ],
    "src": "/art/prayer-bajo-tu-amparo.webp",
    "title": "La Virgen de la Misericordia",
    "artist": "Piero della Francesca",
    "year": "h. 1445-1462",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Piero_della_francesca,_madonna_della_misericordia.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:acordaos"
    ],
    "src": "/art/prayer-acordaos.webp",
    "title": "La Virgen en la iglesia",
    "artist": "Jan van Eyck",
    "year": "h. 1438-1440",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jan_van_Eyck_-_The_Madonna_in_the_Church_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 25%"
  },
  {
    "keys": [
      "prayer:magnificat"
    ],
    "src": "/art/prayer-magnificat.webp",
    "title": "La Virgen del Magníficat",
    "artist": "Sandro Botticelli",
    "year": "h. 1481",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Madonna_of_the_Magnificat.png",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:jaculatoria-maria"
    ],
    "src": "/art/prayer-jaculatoria-maria.webp",
    "title": "La Virgen en oración",
    "artist": "Sassoferrato",
    "year": "h. 1640-1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vierge_en_oraison_(Il_Sassoferrato).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:san-miguel-arcangel"
    ],
    "src": "/art/prayer-san-miguel-arcangel.webp",
    "title": "San Miguel y el dragón",
    "artist": "Rafael Sanzio",
    "year": "h. 1503-1505",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raffaello_Sanzio_-_St_Michael_and_the_Dragon_-_WGA18633.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:san-gabriel-arcangel"
    ],
    "src": "/art/prayer-san-gabriel-arcangel.webp",
    "title": "La Anunciación (arcángel san Gabriel)",
    "artist": "Leonardo da Vinci",
    "year": "h. 1472-1476",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Leonardo_da_Vinci_-_Annunciazione_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "25% 50%"
  },
  {
    "keys": [
      "prayer:san-rafael-arcangel"
    ],
    "src": "/art/prayer-san-rafael-arcangel.webp",
    "title": "Tobías y el arcángel san Rafael",
    "artist": "Tiziano",
    "year": "h. 1542",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Madonna_dell%27Orto_(Venice)_-_Chapel_Vendramin_-_Arcangel_Raphael_and_Tobias_by_Titien.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "prayer:san-jose"
    ],
    "src": "/art/prayer-san-jose.webp",
    "title": "San José carpintero",
    "artist": "Georges de La Tour",
    "year": "h. 1642",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Saint_Joseph_charpentier_(La_Tour).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:san-jose-buena-muerte"
    ],
    "src": "/art/prayer-san-jose-buena-muerte.webp",
    "title": "La muerte de san José",
    "artist": "Simone Barabino",
    "year": "s. XIX",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Simone_Barabino_-_The_Death_of_Saint_Joseph_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:san-benito"
    ],
    "src": "/art/prayer-san-benito.webp",
    "title": "San Benito recibe a Mauro y Plácido",
    "artist": "Il Sodoma",
    "year": "1505-1508",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sodoma_-_Life_of_St_Benedict,_Scene_12_-_Benedict_Receives_Maurus_and_Placidus_-_WGA21573.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:acto-de-reparacion-sagrado-corazon"
    ],
    "src": "/art/prayer-acto-de-reparacion-sagrado-corazon.webp",
    "title": "Ecce Homo",
    "artist": "Antonello da Messina",
    "year": "1473",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Antonello_da_Messina_-_Ecce_Homo.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:jaculatorias-sagrado-corazon"
    ],
    "src": "/art/prayer-jaculatorias-sagrado-corazon.webp",
    "title": "Cristo bendiciendo",
    "artist": "Giovanni Bellini",
    "year": "h. 1500",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Giovanni_Bellini_-_Blessing_Christ_-_WGA1635.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:via-crucis"
    ],
    "src": "/art/prayer-via-crucis.webp",
    "title": "Cristo con la cruz a cuestas",
    "artist": "El Bosco",
    "year": "h. 1510-1516",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bosch_-_Christ_Carrying_the_Cross,_ca._1510_-_ca._1516,_Inv._1902-H.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:santa-faz"
    ],
    "src": "/art/prayer-santa-faz.webp",
    "title": "La Santa Faz",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1635",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Francisco_de_Zurbar%C3%A1n_-_The_Sudarium_of_St_Veronica_-_WGA26079.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:requiem-aeternam"
    ],
    "src": "/art/prayer-requiem-aeternam.webp",
    "title": "Finis gloriae mundi",
    "artist": "Juan de Valdés Leal",
    "year": "1672",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_de_Vald%C3%A9s_Leal_-_Finis_Gloriae_Mundi_-_WGA24215.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:oracion-por-un-difunto"
    ],
    "src": "/art/prayer-oracion-por-un-difunto.webp",
    "title": "El Santo Entierro",
    "artist": "Caravaggio",
    "year": "1603-1604",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Caravaggio_-_Entombment_of_Christ.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:oracion-por-un-familiar-fallecido"
    ],
    "src": "/art/prayer-oracion-por-un-familiar-fallecido.webp",
    "title": "La Piedad",
    "artist": "Giovanni Bellini",
    "year": "h. 1460",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Giovanni_Bellini_-_Piet%C3%A0,_1460_circa.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:de-profundis"
    ],
    "src": "/art/prayer-de-profundis.webp",
    "title": "Lamentación sobre Cristo muerto",
    "artist": "Andrea Mantegna",
    "year": "h. 1480",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Andrea_Mantegna_-_Lamentation_of_Christ_-_Pinacoteca_di_Brera_(Milan).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-proximos-a-morir"
    ],
    "src": "/art/prayer-oracion-proximos-a-morir.webp",
    "title": "La extremaunción",
    "artist": "Nicolas Poussin",
    "year": "1636-1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:L%27Extr%C3%AAme_onction_I,_vers_1640,_Grantham,_Belvoir_Castle.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-el-hogar"
    ],
    "src": "/art/prayer-oracion-por-el-hogar.webp",
    "title": "La casa de Nazaret",
    "artist": "Francisco de Zurbarán",
    "year": "h. 1640",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:La_casa_de_Nazaret,_por_Zurbar%C3%A1n.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-la-familia"
    ],
    "src": "/art/prayer-oracion-por-la-familia.webp",
    "title": "La Sagrada Familia Canigiani",
    "artist": "Rafael Sanzio",
    "year": "h. 1507",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raffaello_Santi_-_Sacra_Famiglia_Canigiani_(Alte_Pinakothek).jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:oracion-por-los-esposos"
    ],
    "src": "/art/prayer-oracion-por-los-esposos.webp",
    "title": "Los desposorios de la Virgen",
    "artist": "Rafael Sanzio",
    "year": "1504",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raffaello_-_Spozalizio_-_Web_Gallery_of_Art.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:oracion-por-los-hijos"
    ],
    "src": "/art/prayer-oracion-por-los-hijos.webp",
    "title": "Cristo bendice a los niños",
    "artist": "Lucas Cranach el Viejo",
    "year": "h. 1540",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Christ_Blessing_the_Children_MET_DP280362.jpg",
    "license": "CC0",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-el-trabajo"
    ],
    "src": "/art/prayer-oracion-por-el-trabajo.webp",
    "title": "Cristo en casa de sus padres",
    "artist": "John Everett Millais",
    "year": "1849-1850",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:John_Everett_Millais_-_Christ_in_the_House_of_his_Parents_(1849-50)_(Tate_Britain).jpg",
    "license": "CC0",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-antes-de-viajar"
    ],
    "src": "/art/prayer-oracion-antes-de-viajar.webp",
    "title": "La huida a Egipto",
    "artist": "Bartolomé Esteban Murillo",
    "year": "h. 1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bartolom%C3%A9_Esteban_Murillo_-_The_Flight_into_Egypt_-_48.96_-_Detroit_Institute_of_Arts.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:oracion-por-la-paz"
    ],
    "src": "/art/prayer-oracion-por-la-paz.webp",
    "title": "El reino apacible",
    "artist": "Edward Hicks",
    "year": "h. 1834",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Edward_Hicks_-_Peaceable_Kingdom.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-el-papa-y-la-iglesia"
    ],
    "src": "/art/prayer-oracion-por-el-papa-y-la-iglesia.webp",
    "title": "La entrega de las llaves a san Pedro",
    "artist": "Perugino",
    "year": "1481-1482",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Entrega_de_las_llaves_a_San_Pedro_(Perugino).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-las-vocaciones"
    ],
    "src": "/art/prayer-oracion-por-las-vocaciones.webp",
    "title": "La vocación de san Mateo",
    "artist": "Caravaggio",
    "year": "1599-1600",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Caravaggio,_Michelangelo_Merisi_da_-_The_Calling_of_Saint_Matthew_-_1599-1600_(hi_res).jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-la-paz-san-francisco"
    ],
    "src": "/art/prayer-oracion-por-la-paz-san-francisco.webp",
    "title": "San Francisco predica a las aves",
    "artist": "Giotto",
    "year": "h. 1295-1300",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Giotto_-_Legend_of_St_Francis_-_-15-_-_Sermon_to_the_Birds.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:te-deum"
    ],
    "src": "/art/prayer-te-deum.webp",
    "title": "El Juicio Final",
    "artist": "Giotto",
    "year": "1306",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Last-judgment-scrovegni-chapel-giotto-1306.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:oracion-final-rosario"
    ],
    "src": "/art/prayer-oracion-final-rosario.webp",
    "title": "La Virgen del Rosario",
    "artist": "Caravaggio",
    "year": "h. 1607",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Michelangelo_Merisi,_called_Caravaggio_-_Madonna_of_the_Rosary_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:intenciones-papa"
    ],
    "src": "/art/prayer-intenciones-papa.webp",
    "title": "La Misa de Bolsena",
    "artist": "Rafael Sanzio",
    "year": "1512",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raphael_-_The_Mass_at_Bolsena.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-por-los-enfermos"
    ],
    "src": "/art/prayer-oracion-por-los-enfermos.webp",
    "title": "Cristo curando a un ciego",
    "artist": "El Greco",
    "year": "h. 1570",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_-_Christ_Healing_the_Blind_-_WGA10420.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-del-enfermo"
    ],
    "src": "/art/prayer-oracion-del-enfermo.webp",
    "title": "La resurrección de Lázaro",
    "artist": "Rembrandt",
    "year": "h. 1630",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_-_The_Raising_of_Lazarus_-_WGA19118.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:oracion-en-la-angustia"
    ],
    "src": "/art/prayer-oracion-en-la-angustia.webp",
    "title": "La Agonía en el huerto",
    "artist": "Andrea Mantegna",
    "year": "h. 1458-1460",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Mantegna,_Andrea_-_Agony_in_the_Garden_-_National_Gallery,_London.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:oracion-en-el-duelo"
    ],
    "src": "/art/prayer-oracion-en-el-duelo.webp",
    "title": "El Descendimiento",
    "artist": "Rogier van der Weyden",
    "year": "h. 1435",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Weyden-descendimiento-prado-Ca-1435.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:examen-para-confesion"
    ],
    "src": "/art/prayer-examen-para-confesion.webp",
    "title": "Las lágrimas de san Pedro",
    "artist": "El Greco",
    "year": "h. 1587-1596",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:El_Greco_-_Saint_Peter_in_Tears_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:oracion-antes-de-confesarse"
    ],
    "src": "/art/prayer-oracion-antes-de-confesarse.webp",
    "title": "La Magdalena penitente",
    "artist": "Tiziano",
    "year": "h. 1565",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Titian_-_Penitent_Magdalene_(Galleria_Palatina).jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "prayer:oracion-despues-de-la-confesion"
    ],
    "src": "/art/prayer-oracion-despues-de-la-confesion.webp",
    "title": "El regreso del hijo pródigo (Dublín)",
    "artist": "Bartolomé Esteban Murillo",
    "year": "1667-1670",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Murillo_-_The_Return_of_the_Prodigal_Son,_NGI.4545.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "prayer:comunion-espiritual"
    ],
    "src": "/art/prayer-comunion-espiritual.webp",
    "title": "El Salvador eucarístico",
    "artist": "Juan de Juanes",
    "year": "h. 1570",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_de_Juanes_002.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "prayer:oracion-antes-de-la-misa"
    ],
    "src": "/art/prayer-oracion-antes-de-la-misa.webp",
    "title": "La Última Cena",
    "artist": "Tintoretto",
    "year": "1592-1594",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jacopo_Tintoretto_-_The_Last_Supper_-_WGA22649.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:accion-de-gracias-comunion"
    ],
    "src": "/art/prayer-accion-de-gracias-comunion.webp",
    "title": "La comunión de los apóstoles",
    "artist": "Fra Angelico",
    "year": "h. 1442",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Comunione_degli_apostoli,_cella_35.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "prayer:anima-christi"
    ],
    "src": "/art/prayer-anima-christi.webp",
    "title": "San Agustín",
    "artist": "Philippe de Champaigne",
    "year": "h. 1645-1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Philippe_de_Champaigne_-_Saint_Augustine_-_LACMA_-_without_frame.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:bible.BLL"
    ],
    "src": "/art/book-bible.BLL.webp",
    "title": "Moisés con las Tablas de la Ley",
    "artist": "Rembrandt",
    "year": "1659",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_-_Moses_with_the_Ten_Commandments_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:bible.DRA"
    ],
    "src": "/art/book-bible.DRA.webp",
    "title": "San Mateo y el ángel",
    "artist": "Rembrandt",
    "year": "1661",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_Evangelist_Matthew_Inspired_by_an_Angel.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:bible.SBLM"
    ],
    "src": "/art/book-bible.SBLM.webp",
    "title": "San Juan Evangelista en Patmos",
    "artist": "Tiziano",
    "year": "h. 1553-1555",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Saint_John_the_Evangelist_on_Patmos.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "book:bible.SCIO"
    ],
    "src": "/art/book-bible.SCIO.webp",
    "title": "Los cuatro evangelistas",
    "artist": "Pedro Pablo Rubens",
    "year": "h. 1614",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_The_Four_Evangelists_-_WGA20197.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "book:bible.VULG"
    ],
    "src": "/art/book-bible.VULG.webp",
    "title": "San Jerónimo como erudito",
    "artist": "El Greco",
    "year": "h. 1610",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Saint_Jerome_as_Scholar_MET_DT3103.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:bible"
    ],
    "src": "/art/book-bible.webp",
    "title": "La creación de Adán",
    "artist": "Miguel Ángel",
    "year": "1511-1512",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sistine_Chapel_ceiling,_Creation_of_Adam.jpg",
    "license": "Public domain",
    "focus": "50% 45%"
  },
  {
    "keys": [
      "book:doc"
    ],
    "src": "/art/book-doc.webp",
    "title": "El ratón de biblioteca",
    "artist": "Carl Spitzweg",
    "year": "h. 1850",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Carl_Spitzweg_Der_B%C3%BCcherwurm_537.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.azul"
    ],
    "src": "/art/book-doc.azul.webp",
    "title": "Rubén Darío",
    "artist": "Fotografía de 1892",
    "year": "1892",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ruben_Dario_retrato_BNC_1892.jpg",
    "license": "CC0",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "book:doc.comentarios-reales"
    ],
    "src": "/art/book-doc.comentarios-reales.webp",
    "title": "Inca Garcilaso de la Vega",
    "artist": "Retrato anónimo",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Inca_Garcilaso_1879.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:doc.confesiones-agustin"
    ],
    "src": "/art/book-doc.confesiones-agustin.webp",
    "title": "San Agustín en su estudio",
    "artist": "Sandro Botticelli",
    "year": "h. 1494",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_Saint_Augustin.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.devocionario-catolico"
    ],
    "src": "/art/book-doc.devocionario-catolico.webp",
    "title": "La Virgen en oración",
    "artist": "Sassoferrato",
    "year": "h. 1650",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sassoferrato_-_The_Virgin_In_Prayer_-_Walters_371861.jpg",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.historia-de-un-alma"
    ],
    "src": "/art/book-doc.historia-de-un-alma.webp",
    "title": "Santa Teresita y Céline Martin",
    "artist": "Fotografía de Céline Martin",
    "year": "1895",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Celine_and_therese_martin_1895.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:doc.imitacion-de-cristo"
    ],
    "src": "/art/book-doc.imitacion-de-cristo.webp",
    "title": "Tomás de Kempis",
    "artist": "Grabado holandés",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Portret_van_Thomas_%C3%A0_Kempis,_RP-P-1906-2490.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.libro-de-la-vida-teresa"
    ],
    "src": "/art/book-doc.libro-de-la-vida-teresa.webp",
    "title": "Santa Teresa de Jesús",
    "artist": "Fray Juan de la Miseria",
    "year": "1576",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Teresa_de_Jes%C3%BAs_(cropped).jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:doc.poesias-san-juan-de-la-cruz"
    ],
    "src": "/art/book-doc.poesias-san-juan-de-la-cruz.webp",
    "title": "San Juan de la Cruz",
    "artist": "Retrato anónimo",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Retrato_del_padre_fray_Juan_de_la_Cruz_OFM.jpg",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:doc.poesias-santa-teresa"
    ],
    "src": "/art/book-doc.poesias-santa-teresa.webp",
    "title": "La visión de la paloma de santa Teresa",
    "artist": "Pedro Pablo Rubens",
    "year": "s. XVII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Saint_Teresa_of_Avila%27s_Vision_of_the_Dove_MET_DP878530.jpg",
    "license": "CC0",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.poesias-sor-juana"
    ],
    "src": "/art/book-doc.poesias-sor-juana.webp",
    "title": "Sor Juana Inés de la Cruz",
    "artist": "Miguel Cabrera",
    "year": "h. 1750",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sor_Juana_by_Miguel_Cabrera.png",
    "license": "Public domain",
    "focus": "50% 35%"
  },
  {
    "keys": [
      "book:doc.martin-fierro"
    ],
    "src": "/art/book-doc.martin-fierro.webp",
    "title": "Dos gauchos en el palenque",
    "artist": "Juan Manuel Blanes",
    "year": "1880",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_Manuel_Blanes_-_Dos_gauchos_en_el_palenque.png",
    "license": "Public domain",
    "focus": "50% 40%"
  },
  {
    "keys": [
      "book:doc.tradiciones-peruanas-primera-serie"
    ],
    "src": "/art/book-doc.tradiciones-peruanas-primera-serie.webp",
    "title": "Plaza Mayor de Lima",
    "artist": "Johann Moritz Rugendas",
    "year": "1843",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Juan_Mauricio_Rugendas_-_Study_for_Lima%E2%80%99s_Main_Square_-_Google_Art_Project.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  },
  {
    "keys": [
      "book:doc.versos-sencillos"
    ],
    "src": "/art/book-doc.versos-sencillos.webp",
    "title": "José Martí",
    "artist": "Fotografía de h. 1891",
    "year": "1891",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jos%C3%A9_Mart%C3%AD_(1853-1895).jpg",
    "license": "Public domain",
    "focus": "50% 30%"
  },
  {
    "keys": [
      "book:doc.romancero-viejo"
    ],
    "src": "/art/book-doc.romancero-viejo.webp",
    "title": "Cantigas de Santa María",
    "artist": "Taller de Alfonso X el Sabio",
    "year": "s. XIII",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cantigas_1.jpg",
    "license": "Public domain",
    "focus": "50% 50%"
  }
];
// </GENERADO>

const BY_KEY = new Map<string, Art>();
for (const { keys, ...art } of ENTRIES) for (const k of keys) BY_KEY.set(k, art);

/** Una o varias claves por orden de preferencia (la primera que tenga imagen gana). */
export type ArtKey = string | string[];

/** Clave de grupo cuando una novena no tiene imagen propia. */
function novenaGroup(id: string): string {
  if (/^(san|santa)-/.test(id)) return 'category:santos';
  if (id.startsWith('virgen-')) return 'category:virgen-maria';
  return 'category:novenas';
}

/** ¿Tiene esta clave una imagen propia (sin alias ni respaldos)? */
export function hasOwnArt(key: string): boolean {
  return BY_KEY.has(key);
}

/** Búsqueda con alias (misterio → conjunto, novena → grupo), sin el respaldo final. */
function lookup(key: string): Art | null {
  const direct = BY_KEY.get(key);
  if (direct) return direct;
  const mystery = /^mystery:([a-z]+)-\d+$/.exec(key);
  if (mystery) return BY_KEY.get(`set:${mystery[1]}`) ?? null;
  if (key.startsWith('novena:')) return BY_KEY.get(novenaGroup(key.slice('novena:'.length))) ?? null;
  return null;
}

/** Primera imagen disponible entre varias claves; si ninguna, `home:default` (salvo para libros: respaldo genérico del tipo). */
export function artForAny(keys: ArtKey): Art | null {
  for (const k of Array.isArray(keys) ? keys : [keys]) {
    const a = lookup(k);
    if (a) return a;
  }
  return null;
}

export function artFor(key: ArtKey): Art | null {
  const found = artForAny(key);
  if (found) return found;
  const first = (Array.isArray(key) ? key[0] : key) ?? '';
  if (first.startsWith('book:')) return BY_KEY.get(/^book:bible[.:]?/.test(first) ? 'book:bible' : 'book:doc') ?? null;
  if (first.startsWith('novena:') || first.startsWith('prayer:') || first.startsWith('category:')) return BY_KEY.get('home:default') ?? null;
  return null;
}

/** Claves de arte de un libro de la Biblioteca: el propio y el genérico de su tipo. */
export function bookArtKeys(id: string, kind?: string): string[] {
  return [`book:${id}`, kind === 'bible' || id.startsWith('bible.') ? 'book:bible' : 'book:doc'];
}

/** Créditos sin duplicados (una entrada por cuadro), para «Fuentes y licencias». */
export const ART_CREDITS: Art[] = ENTRIES.map(({ keys: _keys, ...art }) => art);
