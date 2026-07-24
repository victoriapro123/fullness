"""Contrato formal de servicios Fullness Lab.

Diseñado como documento jurídico editorial para cargar posteriormente en
Adobe Acrobat Sign. Las líneas de datos y firmas son deliberadamente limpias:
Acrobat Sign puede superponer sus propios campos sin que el PDF parezca una
aplicación o un formulario web.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path('/Users/carlosrodriguezsilva/Desktop/Desarrollos/fullness')
OUT = ROOT / 'Contrato_Soporte_Fullness_AdobeSign.pdf'
LOGO = Path(
    '/Users/carlosrodriguezsilva/Library/Mobile Documents/'
    'com~apple~CloudDocs/Adobe/Prof3sional Core 360/'
    'Texto Prof3sional Core 360.png'
)

PAGE_W, PAGE_H = A4
MARGIN_X = 21 * mm
MARGIN_TOP = 27 * mm
MARGIN_BOTTOM = 22 * mm
CONTENT_W = PAGE_W - 2 * MARGIN_X

INK = colors.HexColor('#1E2429')
SLATE = colors.HexColor('#667078')
LINE = colors.HexColor('#C8CDD1')
LIGHT_LINE = colors.HexColor('#E5E8EA')
ORANGE = colors.HexColor('#E65225')
MAGENTA = colors.HexColor('#A91A57')
WHITE = colors.white


def esc(text: str) -> str:
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    'ContractBody',
    parent=styles['Normal'],
    fontName='Times-Roman',
    fontSize=9.65,
    leading=13.55,
    textColor=INK,
    spaceAfter=7.2,
    alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    'ContractBodyTight',
    parent=styles['ContractBody'],
    fontSize=9.15,
    leading=12.55,
    spaceAfter=5.5,
))
styles.add(ParagraphStyle(
    'CoverEyebrow',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=7.3,
    leading=9.2,
    textColor=MAGENTA,
    spaceAfter=7,
    tracking=0.4,
))
styles.add(ParagraphStyle(
    'CoverTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=20.2,
    leading=24,
    textColor=INK,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    'CoverSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=11.1,
    leading=15,
    textColor=SLATE,
    spaceAfter=17,
))
styles.add(ParagraphStyle(
    'Section',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=14.2,
    leading=17.5,
    textColor=INK,
    spaceBefore=0,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    'Subsection',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8.5,
    leading=11,
    textColor=MAGENTA,
    spaceBefore=6,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    'Label',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=6.75,
    leading=8.2,
    textColor=SLATE,
))
styles.add(ParagraphStyle(
    'LabelRight',
    parent=styles['Label'],
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'Small',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=7.8,
    leading=10.2,
    textColor=SLATE,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    'Signature',
    parent=styles['Normal'],
    fontName='Times-Roman',
    fontSize=8.5,
    leading=11.2,
    textColor=INK,
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'SignatureLabel',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=7.4,
    leading=9.2,
    textColor=SLATE,
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'ContractBullet',
    parent=styles['ContractBody'],
    leftIndent=14,
    firstLineIndent=-8,
    bulletIndent=3,
    spaceAfter=4.1,
))


class DetailRule(Flowable):
    """A restrained field line for information Adobe Sign will map later."""

    def __init__(self, label, height=19):
        super().__init__()
        self.label = label
        self.height = height

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        return avail_width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(SLATE)
        c.setFont('Helvetica-Bold', 6.7)
        c.drawString(0, self.height - 7, self.label.upper())
        c.setStrokeColor(LINE)
        c.setLineWidth(0.55)
        c.line(0, 1.7, self.width, 1.7)


class SignatureLine(Flowable):
    def __init__(self, width):
        super().__init__()
        self.width = width

    def wrap(self, avail_width, avail_height):
        return self.width, 1

    def draw(self):
        self.canv.setStrokeColor(INK)
        self.canv.setLineWidth(0.65)
        self.canv.line(0, 0, self.width, 0)


def para(text, style='ContractBody'):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(text, styles['ContractBullet'], bulletText='•')


def page_header(page_number):
    """In-flow page furniture: renders consistently across Acrobat and Preview."""
    left = Paragraph('PROF3SIONAL CHILE SpA', styles['Label'])
    right = Paragraph(
        'Contrato de servicios · fullnesslab.com',
        styles['LabelRight'],
    )
    table = Table([[left, right], ['', '']], colWidths=[CONTENT_W * 0.38, CONTENT_W * 0.62])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 1), (0, 1), 0.8, ORANGE),
        ('LINEBELOW', (1, 1), (1, 1), 0.45, LIGHT_LINE),
    ]))
    return [table, Spacer(1, 11 * mm)]


def section(number, title, page_number):
    return [
        *page_header(page_number),
        Paragraph(f'{number}. {esc(title)}', styles['Section']),
    ]


def draw_logo(c):
    """Use the brand only on the cover, where it has enough clear space."""
    if LOGO.exists():
        # Exact ratio is preserved so no brand lettering is compressed.
        c.drawImage(
            ImageReader(str(LOGO)), MARGIN_X, PAGE_H - 22.2 * mm,
            width=45 * mm, height=10.55 * mm,
            preserveAspectRatio=True, mask='auto',
        )
    else:
        c.setFillColor(INK)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(MARGIN_X, PAGE_H - 16 * mm, 'PROF3SIONAL CHILE SpA')


def draw_cover(c, doc):
    c.saveState()
    draw_logo(c)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.2)
    c.line(MARGIN_X, PAGE_H - 27.3 * mm, MARGIN_X + 26 * mm, PAGE_H - 27.3 * mm)
    c.setStrokeColor(MAGENTA)
    c.line(MARGIN_X + 28 * mm, PAGE_H - 27.3 * mm, MARGIN_X + 42 * mm, PAGE_H - 27.3 * mm)
    footer(c, doc)
    c.restoreState()


def draw_later_page(c, doc):
    # Headers and page numbers are part of the flow, avoiding visual overlaps
    # when a signer opens the document in different PDF viewers.
    return


def footer(c, doc):
    y = 13.2 * mm
    c.setStrokeColor(LIGHT_LINE)
    c.setLineWidth(0.45)
    c.line(MARGIN_X, y + 5 * mm, PAGE_W - MARGIN_X, y + 5 * mm)
    c.setFillColor(SLATE)
    c.setFont('Helvetica', 6.8)
    c.drawString(MARGIN_X, y, 'Documento preparado para firma electrónica')
    c.drawRightString(PAGE_W - MARGIN_X, y, f'Página {doc.page}')


def key_values(rows, left_w=44 * mm):
    data = []
    for label, value in rows:
        data.append([
            Paragraph(label, styles['Label']),
            Paragraph(value, styles['ContractBodyTight']),
        ])
    table = Table(data, colWidths=[left_w, CONTENT_W - left_w], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.35, LIGHT_LINE),
    ]))
    return table


def client_information_block():
    gutter = 9 * mm
    col = (CONTENT_W - gutter) / 2
    table = Table([
        [DetailRule('Razón social / nombre'), DetailRule('RUT')],
        [DetailRule('Domicilio'), DetailRule('Comuna')],
        [DetailRule('Representante'), DetailRule('RUT representante')],
        [DetailRule('Correo de notificaciones'), DetailRule('Teléfono')],
    ], colWidths=[col, col], rowHeights=[20, 20, 20, 20])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), gutter),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def tariff_table():
    data = [
        [para('CONCEPTO', 'Label'), para('TARIFA NETA MENSUAL', 'Label')],
        [para('Infraestructura: Vercel, Supabase y Cloudflare R2', 'ContractBodyTight'), para('0,5 UF', 'ContractBodyTight')],
        [para('Soporte mensual: una hora efectiva', 'ContractBodyTight'), para('1 UF', 'ContractBodyTight')],
        [para('Hora efectiva adicional, previa aprobación escrita', 'ContractBodyTight'), para('1 UF por hora', 'ContractBodyTight')],
    ]
    table = Table(data, colWidths=[CONTENT_W * 0.72, CONTENT_W * 0.28], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (0, 0), (-1, 0), 0.75, INK),
        ('LINEBELOW', (0, 0), (-1, -1), 0.35, LIGHT_LINE),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    return table


def hours_table(rows):
    """Reference-hour matrix with a repeated, restrained legal-document header."""
    data = [[
        Paragraph('GESTIÓN O ACTIVIDAD REFERENCIAL', styles['Label']),
        Paragraph('HORAS', styles['LabelRight']),
    ]]
    for activity, hours in rows:
        data.append([
            Paragraph(activity, styles['ContractBodyTight']),
            Paragraph(hours, styles['ContractBodyTight']),
        ])
    table = Table(
        data,
        colWidths=[CONTENT_W * 0.82, CONTENT_W * 0.18],
        repeatRows=1,
        hAlign='LEFT',
    )
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('LINEABOVE', (0, 0), (-1, 0), 0.75, INK),
        ('LINEBELOW', (0, 0), (-1, -1), 0.35, LIGHT_LINE),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    return table


def signature_block():
    gutter = 13 * mm
    col = (CONTENT_W - gutter) / 2
    prestador = [
        Spacer(1, 34 * mm),
        SignatureLine(col - 9 * mm),
        Spacer(1, 3.5 * mm),
        para('POR EL PRESTADOR', 'SignatureLabel'),
        para('Prof3sional Chile SpA<br/>RUT 76.424.312-9<br/>Carlos Rodrigo Rodríguez Silva<br/>RUT 17.660.908-7', 'Signature'),
    ]
    cliente = [
        Spacer(1, 34 * mm),
        SignatureLine(col - 9 * mm),
        Spacer(1, 3.5 * mm),
        para('POR EL CLIENTE', 'SignatureLabel'),
        para('Razón social / nombre<br/>RUT<br/>Representante<br/>RUT representante', 'Signature'),
    ]
    table = Table([[prestador, cliente]], colWidths=[col, col], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4.5 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4.5 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def build_story():
    story = []

    # Portada y comparecencia
    story += [
        Spacer(1, 30 * mm),
        para('CONTRATO DE PRESTACIÓN DE SERVICIOS', 'CoverEyebrow'),
        para('Infraestructura, soporte técnico y garantía', 'CoverTitle'),
        para('Sitio web: <b>fullnesslab.com</b>', 'CoverSubtitle'),
        key_values([
            ('Vigencia inicial', '1 de agosto de 2026'),
            ('Precio del primer período anual', '<b>$62.000 netos mensuales</b>, más impuestos legalmente aplicables'),
            ('Modalidad de pago', 'Pago mensual anticipado mediante PAC y/o PAT'),
            ('Término por el Cliente', 'En cualquier momento, sin aviso previo; el período pagado no se devuelve'),
        ]),
        Spacer(1, 14 * mm),
        para('COMPARECENCIA', 'Subsection'),
        para(
            'Comparecen: <b>Prof3sional Chile SpA</b>, RUT 76.424.312-9, domiciliada en '
            'Av. Miraflores 2000, Peñaflor, representada legalmente por don <b>Carlos Rodrigo '
            'Rodríguez Silva</b>, RUT 17.660.908-7, en adelante el “<b>Prestador</b>”; y la persona '
            'individualizada a continuación, en adelante el “<b>Cliente</b>”.'
        ),
        Spacer(1, 3 * mm),
        para('DATOS DEL CLIENTE', 'Subsection'),
        client_information_block(),
        Spacer(1, 9 * mm),
        para(
            'Las partes celebran el presente contrato de prestación de servicios (el “<b>Contrato</b>”), '
            'que se regirá por las cláusulas siguientes. Todos los valores que se indiquen son netos, '
            'salvo que se señale expresamente lo contrario.',
            'ContractBodyTight',
        ),
        PageBreak(),
    ]

    # 1. Objeto y alcance
    story += section('1', 'Objeto, alcance y vigencia', 2)
    story += [
        para(
            'El Prestador proporcionará al Cliente los servicios de infraestructura, soporte técnico '
            'mensual y garantía asociados al sitio web <b>fullnesslab.com</b> (el “<b>Sitio</b>”). El '
            'Contrato entrará en vigencia el <b>1 de agosto de 2026</b> y se renovará automáticamente '
            'por períodos sucesivos de 12 meses, salvo término comunicado conforme a la cláusula séptima.'
        ),
        para('ALCANCE IMPLEMENTADO Y CONTRATADO', 'Subsection'),
        bullet('Diseño y publicación de un sitio web premium, con identidad visual propia, videos, formularios y llamados a la acción.'),
        bullet('Venta de programas, planes o productos; suscripciones; integración de pagos en línea y flujo de compra.'),
        para(
            '<b>Toda funcionalidad, desarrollo, licencia o servicio no contemplado expresamente se '
            'considerará fuera de alcance y requerirá una cotización y aceptación separada por escrito.</b>'
        ),
        PageBreak(),
    ]

    # 2. Infraestructura, soporte y garantía
    story += section('2', 'Infraestructura, soporte y garantía', 3)
    story += [
        para('INFRAESTRUCTURA', 'Subsection'),
        para(
            'El servicio de infraestructura comprende la administración técnica del Sitio sobre: '
            '<b>Vercel</b> para servidor y despliegue; <b>Supabase</b> para base de datos y servicios '
            'asociados; y <b>Cloudflare R2</b> para almacenamiento de archivos compatible con S3.'
        ),
        para(
            'La infraestructura es administrada exclusivamente por el Prestador. Durante la vigencia del '
            'Contrato no se entregarán accesos directos ni credenciales de administración de Vercel, '
            'Supabase, Cloudflare R2 ni de las demás cuentas técnicas utilizadas para operar el Sitio. '
            'Lo anterior no limita las modalidades de entrega de activos reguladas en la cláusula quinta.'
        ),
        para('SOPORTE MENSUAL', 'Subsection'),
        para(
            'El Cliente dispondrá de una (1) hora efectiva mensual de soporte para análisis, diagnóstico, '
            'configuración, corrección de funcionamiento, pruebas y validaciones vinculadas al Sitio. '
            'La hora mensual no utilizada no se devuelve, no se acumula ni se traslada al mes siguiente.'
        ),
        para(
            'Las horas de soporte que excedan la hora incluida se cobrarán a razón de <b>1 UF neta por '
            'hora efectiva adicional</b>, aplicando el valor de la UF vigente a la fecha de emisión de la '
            'factura respectiva y previa aprobación escrita del Cliente. Las horas se contabilizan en '
            'incrementos de 0,1 hora, conforme al Anexo 1.'
        ),
        para('GARANTÍA DE CORRECCIONES MENORES', 'Subsection'),
        para(
            'Durante un mes contado desde la entrega del Sitio, el Prestador corregirá sin cargo los '
            'errores de implementación que impidan o alteren el funcionamiento de una funcionalidad '
            'expresamente entregada conforme al alcance contratado. La garantía no se imputa a la hora '
            'mensual de soporte y no constituye una bolsa de solicitudes, soporte mensual ni un derecho '
            'a modificaciones posteriores a la entrega.'
        ),
        para(
            'No son garantía las solicitudes de cambio estético, criterio subjetivo, contenido, textos, '
            'imágenes, estructura, comportamiento, configuración, integración, nuevas preferencias o '
            'nuevas necesidades del Cliente, aunque se refieran a elementos existentes. Estas solicitudes '
            'se atenderán como soporte o como trabajo fuera de alcance, según corresponda. Tampoco son '
            'garantía las intervenciones de terceros ni incidencias originadas en servicios externos, '
            'credenciales o proveedores ajenos al Prestador.'
        ),
        PageBreak(),
    ]

    # 3. Tickets
    story += section('3', 'Tickets, estimaciones y rendición', 4)
    story += [
        para(
            'Las solicitudes de soporte podrán presentarse por WhatsApp, correo electrónico o ticketera. '
            'Las direcciones, números, enlaces y condiciones operativas de estos canales serán comunicados '
            'oportunamente por el Prestador, y podrán crearse, modificarse o reemplazarse sin requerir '
            'modificación de este Contrato.'
        ),
        para(
            'Para comunicaciones generales y de coordinación, el Prestador dispone de los correos '
            '<b>contacto@prof3sional.com</b>, <b>pagos@prof3sional.com</b> y '
            '<b>carlos@prof3sional.com</b>.'
        ),
        para('PROCEDIMIENTO DE ATENCIÓN', 'Subsection'),
        bullet('Inmediatamente después de recibida la solicitud, el Prestador informará la estimación de horas efectivas requeridas para su atención.'),
        bullet('La estimación es referencial y podrá ajustarse si el diagnóstico revela antecedentes técnicos nuevos. No se ejecutarán horas adicionales sin aprobación previa y escrita del Cliente.'),
        bullet('Al cerrar cada ticket, el Prestador informará el resultado, las acciones realizadas y las horas efectivamente utilizadas.'),
        bullet('El Cliente podrá solicitar un resumen mensual de tickets, resultados y horas utilizadas durante la vigencia del Contrato.'),
        para(
            'El Prestador conservará los antecedentes razonables de atención necesarios para emitir la '
            'rendición señalada precedentemente. Los canales de soporte no constituyen un mecanismo de '
            'notificación contractual, salvo que una comunicación se dirija expresamente como tal.'
        ),
        para(
            'La atención se realizará según la naturaleza, complejidad y antecedentes disponibles de cada '
            'solicitud, así como de la disponibilidad de terceros cuando corresponda. Salvo acuerdo escrito '
            'distinto, este Contrato no establece niveles de servicio, disponibilidad continua ni plazos '
            'garantizados de primera respuesta, resolución o recuperación; las estimaciones informadas no '
            'constituyen fechas comprometidas de término.'
        ),
        PageBreak(),
    ]

    # 4. Precio
    story += section('4', 'Precio, facturación, pago y mora', 5)
    story += [
        tariff_table(),
        Spacer(1, 8 * mm),
        para(
            'El precio mensual total del servicio es de <b>1,5 UF netas</b>, compuesto por 0,5 UF netas '
            'de infraestructura y 1 UF neta de soporte mensual.'
        ),
        para(
            'Para el primer período anual, comprendido entre el 1 de agosto de 2026 y el 31 de julio de '
            '2027, el precio mensual se fija en <b>$62.000 netos</b>. Este monto corresponde al valor '
            'referencial de 1,5 UF convertido a pesos y <b>redondeado hacia arriba a la unidad de mil '
            'pesos</b>, y regirá sin variación durante dicho período anual, salvo los servicios adicionales '
            'efectivamente aprobados conforme a este Contrato.'
        ),
        para(
            'En cada renovación automática de 12 meses, se determinará el nuevo precio utilizando el '
            'valor vigente de 1,5 UF a la fecha de renovación, convertido a pesos y redondeado hacia '
            'arriba a la unidad de mil pesos. El valor resultante regirá durante los 12 meses siguientes.'
        ),
        para('FACTURACIÓN, PAGO Y MORA', 'Subsection'),
        para(
            'El servicio se paga por mes adelantado. El primer pago deberá efectuarse el <b>1 de agosto '
            'de 2026</b>. Las facturas siguientes serán emitidas y pagadas el primer día hábil de cada '
            'mes. El pago se efectuará mediante suscripción y cargo automático PAC y/o PAT; el Cliente '
            'deberá mantener vigente el mandato y contar con fondos suficientes para el cargo.'
        ),
        para(
            'Si por corresponder a un día inhábil el cargo automático del primer período no pudiere '
            'procesarse el 1 de agosto de 2026, se efectuará el primer día hábil siguiente, sin que ello '
            'constituya mora. El rechazo, revocación o falta de fondos en el medio PAC/PAT no extingue la '
            'obligación de pago; el Cliente deberá regularizarlo oportunamente por el medio que indique el '
            'Prestador.'
        ),
        para(
            'El Cliente contará con un día de gracia para pagar cada factura. A partir del segundo día de '
            'mora se devengará, sobre el monto insoluto, un interés moratorio diario equivalente a la '
            'tasa máxima convencional vigente y aplicable, prorrateada sobre base de 360 días, sin '
            'exceder el máximo legal permitido.'
        ),
        para(
            'Los datos operativos del mandato PAC/PAT serán gestionados en el medio de pago '
            'correspondiente, sin necesidad de individualizarlos en este Contrato.',
            'ContractBodyTight',
        ),
        PageBreak(),
    ]

    # 5. Suspension and assets
    story += section('5', 'Suspensión, propiedad y entrega', 6)
    story += [
        para(
            'Al acumularse dos facturas vencidas e impagas, una vez finalizado el respectivo día de '
            'gracia, el Prestador podrá suspender la infraestructura, el soporte y la atención de nuevos '
            'tickets. La suspensión no extingue las obligaciones de pago ni los intereses devengados.'
        ),
        para('PROPIEDAD', 'Subsection'),
        para(
            'La información, contenidos, textos, imágenes, productos, bases de datos y demás material '
            'aportado por el Cliente son de propiedad del Cliente. El código y los activos desarrollados '
            'específicamente para el Sitio son de propiedad del Cliente, sin perjuicio de los componentes '
            'de terceros sujetos a sus propias licencias.'
        ),
        para(
            'El Cliente recibirá una invitación con rol de <b>propietario (Owner)</b> al repositorio '
            'GitHub que contiene el código fuente del Sitio. Este acceso se mantendrá disponible durante '
            'toda la vigencia del Contrato y no está condicionado a su término. El repositorio no '
            'comprende claves, secretos, variables de entorno ni credenciales de servicios.'
        ),
        para(
            'El backoffice habilitado en el Sitio permitirá al Cliente exportar, cuando la respectiva '
            'tabla se encuentre disponible en la interfaz, sus datos en formato <b>.csv</b>. Esta '
            'facilidad no otorga acceso directo a la base de datos ni a la infraestructura.'
        ),
        para('ENTREGA AL TÉRMINO', 'Subsection'),
        para(
            'Cuando el Cliente solicite por escrito la entrega de sus activos, el Prestador dispondrá de '
            'un plazo máximo de <b>5 días corridos</b>, contado desde la recepción de la solicitud, para '
            'realizar la entrega en los siguientes términos:'
        ),
        bullet('<b>Base de datos:</b> en el formato de exportación que Supabase permita entregar.'),
        bullet('<b>Archivos alojados en Cloudflare R2:</b> mediante un enlace de descarga disponible durante 30 días corridos.'),
        bullet('<b>Código fuente:</b> permanecerá disponible en el repositorio GitHub del Cliente, conforme al acceso de propietario indicado precedentemente.'),
        bullet('<b>Parámetros de configuración:</b> mediante un informe escrito.'),
        para(
            'La entrega se limita a los activos descritos. No comprende credenciales maestras, cuentas, '
            'perfiles de administración, licencias, servicios de terceros ni accesos a Vercel, Supabase '
            'o Cloudflare R2, sean o no transferibles. Tampoco obliga al Prestador a realizar una '
            'migración, configuración o puesta en marcha en una infraestructura distinta.',
            'ContractBodyTight',
        ),
        PageBreak(),
    ]

    # 6. Responsibility and personal data
    story += section('6', 'Responsabilidad, contenidos y datos personales', 7)
    story += [
        para('CONTENIDOS, MATERIALES Y DATOS DEL CLIENTE', 'Subsection'),
        para(
            'El Cliente declara que es titular o cuenta con todos los derechos, licencias, autorizaciones '
            'y consentimientos necesarios respecto de los contenidos, textos, fotografías, videos, marcas, '
            'documentos, bases de datos y demás materiales que entregue, solicite incorporar o cargue en '
            'el Sitio. Asimismo, declara que su uso no infringe derechos de terceros ni disposiciones '
            'legales, reglamentarias o administrativas aplicables a su actividad.'
        ),
        para(
            'El Cliente será responsable de definir la finalidad y base de licitud de los datos personales '
            'que trate mediante el Sitio, de informar adecuadamente a sus titulares y de atender sus '
            'solicitudes, conforme a la legislación aplicable. El Prestador accederá a dichos datos sólo '
            'en la medida necesaria para prestar infraestructura, operación técnica, soporte o garantía y '
            'de acuerdo con las instrucciones documentadas del Cliente. Esta distribución de funciones no '
            'exime al Prestador de sus propias obligaciones de confidencialidad, seguridad y cumplimiento '
            'legal que le sean aplicables.'
        ),
        para(
            'El Cliente deberá mantener indemne al Prestador de los daños directos, reclamaciones, '
            'sanciones, costos y gastos razonables —incluidos honorarios de defensa— que se originen '
            'directamente en el incumplimiento de las declaraciones u obligaciones precedentes, salvo en '
            'la medida en que provengan de un incumplimiento, uso no autorizado, dolo o culpa grave del '
            'Prestador.'
        ),
        para('LÍMITE DE RESPONSABILIDAD', 'Subsection'),
        para(
            'En la máxima medida permitida por la ley, la responsabilidad total acumulada del Prestador '
            'derivada de este Contrato se limitará a los daños directos efectivamente acreditados y no '
            'excederá el equivalente a tres mensualidades netas pagadas por el Cliente inmediatamente '
            'antes del hecho que origine la reclamación. No se responderá por lucro cesante, pérdida de '
            'oportunidades, pérdida indirecta de datos, perjuicios reputacionales ni daños indirectos o '
            'consecuenciales. Esta limitación no rige respecto de dolo, culpa grave ni de responsabilidades '
            'que la ley no permita excluir o limitar.'
        ),
        PageBreak(),
    ]

    # 7. Term and execution
    story += section('7', 'Término, comunicaciones, confidencialidad y firma', 8)
    story += [
        para(
            '<b>Término por el Cliente.</b> El Cliente podrá poner término al Contrato en cualquier '
            'momento, mediante comunicación escrita, sin necesidad de aviso previo. Como el servicio se '
            'paga por mes adelantado, el término no dará derecho a devolución proporcional por el período '
            'ya pagado. Si la comunicación se recibe antes de la próxima fecha de facturación, no se '
            'cobrará el período siguiente.'
        ),
        para(
            '<b>Comunicaciones.</b> Las notificaciones contractuales se efectuarán a los correos '
            'individualizados por el Cliente en este documento y a los correos del Prestador indicados en '
            'la cláusula tercera. Los canales operativos de soporte podrán actualizarse e informarse '
            'oportunamente sin modificar el Contrato.'
        ),
        para(
            '<b>Confidencialidad.</b> Las partes mantendrán reserva respecto de la información técnica, '
            'comercial, financiera y operativa a la que accedan con ocasión de este Contrato, obligación '
            'que subsistirá después de su término.'
        ),
        para(
            '<b>Ley aplicable y competencia.</b> Este Contrato se rige por las leyes de la República de '
            'Chile. Toda controversia que no pueda resolverse directamente entre las partes será sometida '
            'a los tribunales ordinarios de justicia competentes de Santiago, sin perjuicio de las normas '
            'imperativas que resulten aplicables.'
        ),
        para(
            '<b>Firma electrónica.</b> Leído el presente Contrato, las partes declaran conocer y aceptar '
            'íntegramente sus estipulaciones y lo suscriben mediante firma electrónica. Cada ejemplar '
            'electrónico y su registro de auditoría tendrán el mismo valor probatorio entre las partes que '
            'un ejemplar firmado en soporte papel, en la medida permitida por la ley.',
        ),
        Spacer(1, 4 * mm),
        signature_block(),
        Spacer(1, 9 * mm),
        key_values([
            ('Fecha de firma', '____________________________________________'),
            ('Ciudad de firma', '____________________________________________'),
        ]),
    ]

    # Anexo operativo: mantiene el contrato breve y deja trazabilidad objetiva
    # para solicitudes repetidas o cambios que no corresponden a garantía.
    story += [
        PageBreak(),
        *section('ANEXO 1', 'Matriz de estimación de horas de soporte', 8),
        para(
            'Este Anexo forma parte integrante del Contrato y establece tiempos referenciales para '
            'gestiones habituales realizadas sobre funcionalidades ya existentes. Su finalidad es '
            'permitir al Cliente conocer la estimación antes de autorizar un trabajo y distinguir '
            'adecuadamente el soporte de la garantía.'
        ),
        bullet('<b>Unidad de medida:</b> 0,1 hora equivale a 6 minutos. Las horas se informan y cobran en incrementos de 0,1 hora; toda fracción se redondea hacia arriba al décimo de hora siguiente.'),
        bullet('<b>Estimación y rendición:</b> antes de ejecutar cada solicitud, el Prestador comunicará las horas estimadas. Al cierre del ticket comunicará las horas efectivamente utilizadas.'),
        bullet('<b>Aplicación:</b> las horas corresponden a solicitudes completas y técnicamente viables sobre la funcionalidad disponible. Una actividad no listada, un cambio de alcance o una necesidad nueva requerirá cotización y aprobación separada.'),
        bullet('<b>Garantía:</b> una solicitud solo se tratará como garantía cuando corresponda estrictamente a un error de implementación cubierto por la cláusula segunda; las preferencias, cambios y nuevas solicitudes se imputan a soporte.'),
        para('A. Comunicación, contenidos y elementos visibles', 'Subsection'),
        hours_table([
            ('Recepción, lectura y clasificación inicial de una solicitud de soporte.', '0,1'),
            ('Cambio de número de WhatsApp en un punto de contacto existente.', '0,1'),
            ('Cambio de correo electrónico visible en el Sitio.', '0,1'),
            ('Cambio de enlace a red social, mensajería o sitio externo.', '0,1'),
            ('Cambio de destino de un botón, enlace o llamado a la acción existente.', '0,1'),
            ('Corrección puntual de texto o reemplazo de hasta 100 palabras en una sección existente.', '0,1'),
            ('Reemplazo de un texto breve, título, bajada o mensaje destacado.', '0,2'),
            ('Actualización de fecha, horario, precio visible o etiqueta de disponibilidad existente.', '0,1'),
            ('Activación o desactivación de un mensaje, bloque o banner ya configurado.', '0,1'),
            ('Reemplazo de una imagen simple ya optimizada y entregada por el Cliente.', '0,1'),
            ('Optimización, conversión o ajuste de formato de una imagen entregada por el Cliente.', '0,2'),
            ('Cambio o incorporación de enlace a un documento, archivo o PDF existente.', '0,2'),
            ('Actualización de un video, enlace embebido o recurso audiovisual existente.', '0,2'),
            ('Actualización de texto alternativo o título de una imagen existente.', '0,1'),
        ]),
        PageBreak(),
        *section('ANEXO 1', 'Continuación', 9),
        para('B. Programas, productos, suscripciones y flujo de compra', 'Subsection'),
        hours_table([
            ('Duplicación de un programa o producto ya existente, conservando su estructura.', '0,3'),
            ('Carga de un nuevo programa o producto con plantilla existente y antecedentes completos entregados por el Cliente.', '0,5'),
            ('Modificación de nombre, descripción, precio o condiciones de un programa o producto existente.', '0,2'),
            ('Carga o reemplazo de la imagen principal de un programa o producto.', '0,1'),
            ('Carga o actualización de galería de hasta cinco imágenes ya optimizadas.', '0,3'),
            ('Cambio de importe, periodicidad o texto de una suscripción existente.', '0,2'),
            ('Activación o desactivación de una suscripción, plan o producto existente.', '0,2'),
            ('Actualización de detalle, beneficios o instrucciones de un plan ya creado.', '0,3'),
            ('Cambio de texto de confirmación o instrucciones posteriores a una compra.', '0,2'),
            ('Prueba funcional básica del flujo de compra de un producto o suscripción existente.', '0,3'),
            ('Revisión inicial de una incidencia de pago reportada por el Cliente.', '0,3'),
            ('Configuración o actualización de un cupón existente, si la plataforma lo admite.', '0,3'),
            ('Actualización de disponibilidad, stock manual o visibilidad de una oferta existente.', '0,2'),
            ('Reordenamiento de productos o programas dentro de un listado ya existente.', '0,2'),
            ('Asignación o cambio de categoría existente para un producto o programa.', '0,2'),
            ('Consulta o verificación de información de ventas visible en la interfaz habilitada.', '0,1'),
            ('Actualización de un aviso comercial o condición simple vinculada a una oferta existente.', '0,2'),
        ]),
        PageBreak(),
        *section('ANEXO 1', 'Continuación', 10),
        para('C. Operación técnica, SEO básico y mantención del Sitio', 'Subsection'),
        hours_table([
            ('Diagnóstico inicial de una incidencia técnica identificada por el Cliente.', '0,2'),
            ('Reproducción controlada de un error o comportamiento reportado.', '0,2'),
            ('Revisión de registros técnicos o mensajes de error disponibles.', '0,3'),
            ('Despliegue de una corrección o cambio previamente aprobado.', '0,2'),
            ('Reversión de un último despliegue cuando sea técnicamente procedente.', '0,4'),
            ('Corrección de un error funcional menor posterior al período de garantía.', '0,3'),
            ('Actualización de una configuración pública y no sensible del Sitio.', '0,2'),
            ('Revisión de dominio, certificado SSL o disponibilidad general del Sitio.', '0,2'),
            ('Configuración o ajuste de registro DNS bajo control de un tercero.', '0,4'),
            ('Creación o actualización de una redirección simple de URL existente.', '0,2'),
            ('Incorporación o cambio de un identificador de analítica ya provisto por el Cliente.', '0,3'),
            ('Incorporación de código básico de conversión o seguimiento existente.', '0,4'),
            ('Actualización de título SEO o metadescripción de una página existente.', '0,2'),
            ('Revisión básica de sitemap o indexación disponible públicamente.', '0,3'),
            ('Revisión inicial de rendimiento y recomendaciones generales.', '0,4'),
            ('Ejecución de restauración desde respaldo existente, si técnicamente procede.', '0,5'),
            ('Consulta técnica breve relativa al funcionamiento actual del Sitio.', '0,1'),
        ]),
        PageBreak(),
        *section('ANEXO 1', 'Continuación', 11),
        para('D. Formularios, diseño existente, datos y operación del Cliente', 'Subsection'),
        hours_table([
            ('Cambio de destinatario de un formulario existente.', '0,2'),
            ('Prueba de envío y recepción de un formulario existente.', '0,2'),
            ('Cambio de etiqueta, texto de ayuda u obligatoriedad de un campo ya existente.', '0,2'),
            ('Ajuste menor de salto de línea, espaciado o orden visual en un bloque existente.', '0,1'),
            ('Ajuste CSS menor sobre un componente o estilo ya existente.', '0,2'),
            ('Ajuste de visualización móvil de un componente o sección existente.', '0,3'),
            ('Cambio de ubicación, enlace o texto de un mapa existente.', '0,2'),
            ('Reordenamiento de una sección, bloque o elemento dentro de una página existente.', '0,2'),
            ('Incorporación de una sección simple utilizando componentes y estilos existentes.', '0,5'),
            ('Creación de una página básica utilizando plantilla y componentes existentes.', '0,8'),
            ('Reemplazo de banner con contenido, texto e imágenes entregados por el Cliente.', '0,3'),
            ('Carga o reemplazo de documento legal, política o archivo descargable entregado por el Cliente.', '0,2'),
            ('Exportación desde el backoffice de una tabla disponible en formato .csv.', '0,1'),
            ('Orientación breve para que el Cliente realice una exportación .csv disponible.', '0,1'),
            ('Preparación o validación inicial de una solicitud de exportación de datos.', '0,2'),
            ('Revisión de estado de tickets atendidos u horas utilizadas en el período.', '0,2'),
            ('Coordinación operativa breve respecto de una solicitud ya estimada.', '0,1'),
        ]),
        Spacer(1, 5 * mm),
        para(
            'Las estimaciones del Anexo son referenciales y no constituyen un compromiso de realizar '
            'cambios ilimitados ni de absorber solicitudes sucesivas bajo una misma gestión. Si una '
            'solicitud exige investigación, desarrollo, integraciones, licencias, migraciones, cambios '
            'de alcance o tareas no descritas, se informará una estimación o cotización específica antes '
            'de su ejecución.',
            'ContractBodyTight',
        ),
    ]
    return story


def main():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
        title='Contrato de Servicios de Infraestructura, Soporte y Garantía – fullnesslab.com',
        author='Prof3sional Chile SpA',
    )
    doc.build(build_story(), onFirstPage=draw_cover, onLaterPages=draw_later_page)
    print(OUT)


if __name__ == '__main__':
    main()
