from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, ArrayObject, TextStringObject
from pathlib import Path


OUT = Path('/Users/carlosrodriguezsilva/Desktop/Desarrollos/fullness/Contrato_Soporte_Fullness_formulario.pdf')
TMP = OUT.with_name('Contrato_Soporte_Fullness_formulario_base.pdf')
LOGO_TEXT = Path('/Users/carlosrodriguezsilva/Library/Mobile Documents/com~apple~CloudDocs/Adobe/Prof3sional Core 360/Texto Prof3sional Core 360.png')
BANNER = Path('/Users/carlosrodriguezsilva/Library/Mobile Documents/com~apple~CloudDocs/Adobe/Prof3sional Core 360/Prof3sional Core 360 Banner.png')

W, H = A4
M = 18 * mm
CONTENT_W = W - 2 * M
ORANGE = colors.HexColor('#F4511E')
MAGENTA = colors.HexColor('#B62564')
INK = colors.HexColor('#222222')
MUTED = colors.HexColor('#5F6368')
LIGHT = colors.HexColor('#F5F6F8')
PALE_ORANGE = colors.HexColor('#FFF2EC')
BORDER = colors.HexColor('#CBD1D8')
DARK = colors.HexColor('#111111')

# Use a clean embedded font with full Latin support when available.
FONT = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
for path, name in [
    ('/System/Library/Fonts/Supplemental/Arial.ttf', 'Arial'),
    ('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'Arial-Bold'),
]:
    if Path(path).exists():
        try:
            pdfmetrics.registerFont(TTFont(name, path))
        except Exception:
            pass
if 'Arial' in pdfmetrics.getRegisteredFontNames():
    FONT, FONT_BOLD = 'Arial', 'Arial-Bold'

body = ParagraphStyle('body', fontName=FONT, fontSize=9.1, leading=12.3, textColor=INK, spaceAfter=5)
body_small = ParagraphStyle('body_small', parent=body, fontSize=8.2, leading=10.4, textColor=MUTED)
section = ParagraphStyle('section', fontName=FONT_BOLD, fontSize=12.5, leading=15, textColor=DARK, spaceBefore=3, spaceAfter=7)
subsection = ParagraphStyle('subsection', fontName=FONT_BOLD, fontSize=9.5, leading=12, textColor=MAGENTA, spaceBefore=4, spaceAfter=4)
center_small = ParagraphStyle('center_small', parent=body_small, alignment=TA_CENTER)


def p(c, text, x, y_top, width=CONTENT_W, style=body):
    """Draw a wrapped paragraph whose top edge is y_top; return new y."""
    para = Paragraph(text, style)
    _, h = para.wrap(width, H)
    para.drawOn(c, x, y_top - h)
    return y_top - h - style.spaceAfter


def line(c, x1, y1, x2, y2, color=BORDER, width=0.6):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def footer(c, page_no):
    line(c, M, 13 * mm, W - M, 13 * mm, BORDER, 0.5)
    c.setFont(FONT, 7.2)
    c.setFillColor(MUTED)
    c.drawString(M, 8 * mm, 'Prof3sional Chile SpA · Contrato de soporte fullnesslab.com')
    c.drawRightString(W - M, 8 * mm, f'Página {page_no}')


def header(c, title=None, first=False):
    if first:
        if BANNER.exists():
            c.drawImage(ImageReader(str(BANNER)), W - 72 * mm, H - 29 * mm, width=62 * mm, height=19.4 * mm, preserveAspectRatio=True, mask='auto')
        c.setFillColor(DARK)
        c.setFont(FONT_BOLD, 14)
        c.drawString(M, H - 13 * mm, 'CONTRATO DE SERVICIOS')
        c.setFont(FONT, 8.7)
        c.setFillColor(MUTED)
        c.drawString(M, H - 19 * mm, 'Infraestructura · Soporte · Garantía')
        c.setFillColor(ORANGE)
        c.rect(0, H - 31 * mm, W * 0.58, 1.0 * mm, fill=1, stroke=0)
        c.setFillColor(MAGENTA)
        c.rect(W * 0.58, H - 31 * mm, W * 0.16, 1.0 * mm, fill=1, stroke=0)
    else:
        if LOGO_TEXT.exists():
            c.drawImage(ImageReader(str(LOGO_TEXT)), M, H - 11.8 * mm, width=43 * mm, height=10.1 * mm, preserveAspectRatio=True, mask='auto')
        c.setFillColor(MUTED)
        c.setFont(FONT, 7.4)
        c.drawRightString(W - M, H - 8.5 * mm, 'fullnesslab.com · Documento contractual')
        c.setFillColor(ORANGE)
        c.rect(0, H - 14 * mm, W * 0.58, 0.7 * mm, fill=1, stroke=0)
        c.setFillColor(MAGENTA)
        c.rect(W * 0.58, H - 14 * mm, W * 0.16, 0.7 * mm, fill=1, stroke=0)
        if title:
            c.setFillColor(DARK)
            c.setFont(FONT_BOLD, 15)
            c.drawString(M, H - 27 * mm, title)


def field(c, name, x, y, w, h=16, label=None, multiline=False, value=''):
    if label:
        c.setFillColor(MUTED)
        c.setFont(FONT_BOLD, 7.3)
        c.drawString(x, y + h + 4, label.upper())
    c.acroForm.textfield(
        name=name,
        tooltip=label or name,
        x=x, y=y, width=w, height=h,
        borderStyle='underlined' if h <= 18 else 'solid',
        borderWidth=0.7,
        borderColor=BORDER,
        fillColor=colors.white,
        textColor=INK,
        # AcroForm widgets are limited by ReportLab to the standard 14 fonts.
        fontName='Helvetica',
        fontSize=9,
        value=value,
        fieldFlags='multiline' if multiline else '',
    )


def box(c, x, y, w, h, fill=LIGHT, stroke=BORDER):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)


def bullet(c, text, x, y_top, width=CONTENT_W):
    return p(c, f'<bullet>&bull;</bullet>{text}', x, y_top, width, body)


def add_sig_field(writer, page_index, name, rect):
    page = writer.pages[page_index]
    sig = DictionaryObject()
    sig.update({
        NameObject('/FT'): NameObject('/Sig'),
        NameObject('/Type'): NameObject('/Annot'),
        NameObject('/Subtype'): NameObject('/Widget'),
        NameObject('/T'): TextStringObject(name),
        NameObject('/Rect'): ArrayObject([NumberObject(int(round(v))) for v in rect]),
        NameObject('/F'): NumberObject(4),
        NameObject('/P'): page.indirect_reference,
    })
    sig_ref = writer._add_object(sig)
    annots = page.get('/Annots')
    if annots is None:
        annots = ArrayObject()
        page[NameObject('/Annots')] = annots
    else:
        annots = annots.get_object()
    annots.append(sig_ref)
    acro = writer._root_object.get('/AcroForm')
    if acro is None:
        acro = DictionaryObject()
        writer._root_object[NameObject('/AcroForm')] = acro
    else:
        acro = acro.get_object()
    fields = acro.get('/Fields')
    if fields is None:
        fields = ArrayObject()
        acro[NameObject('/Fields')] = fields
    else:
        fields = fields.get_object()
    fields.append(sig_ref)
    acro[NameObject('/SigFlags')] = NumberObject(3)


def draw_pdf():
    c = canvas.Canvas(str(TMP), pagesize=A4, pageCompression=1)
    c.setTitle('Contrato de Servicios de Infraestructura, Soporte y Garantía - fullnesslab.com')
    c.setAuthor('Prof3sional Chile SpA')

    # PAGE 1
    header(c, first=True)
    y = H - 48 * mm
    c.setFillColor(MAGENTA)
    c.setFont(FONT_BOLD, 8)
    c.drawString(M, y, 'DOCUMENTO FORMULARIO · VERSIÓN PARA FIRMA')
    y -= 7 * mm
    c.setFillColor(DARK)
    c.setFont(FONT_BOLD, 18)
    c.drawString(M, y, 'Contrato de servicios')
    y -= 7 * mm
    c.setFont(FONT, 10)
    c.setFillColor(MUTED)
    c.drawString(M, y, 'Infraestructura, soporte mensual y garantía')
    y -= 13 * mm
    box(c, M, y - 24 * mm, CONTENT_W, 24 * mm, PALE_ORANGE, colors.HexColor('#F3C1AF'))
    c.setFillColor(DARK)
    c.setFont(FONT_BOLD, 9)
    c.drawString(M + 7 * mm, y - 8 * mm, 'VIGENCIA Y COBRO INICIAL')
    c.setFont(FONT, 9)
    c.drawString(M + 7 * mm, y - 14 * mm, 'Inicio de vigencia y primer pago: 1 de agosto de 2026')
    c.drawString(M + 7 * mm, y - 20 * mm, 'Modalidad: pago mensual adelantado mediante PAC/PAT')
    c.setFont(FONT_BOLD, 12)
    c.setFillColor(MAGENTA)
    c.drawRightString(W - M - 7 * mm, y - 14 * mm, '$62.000 netos/mes')
    c.setFont(FONT, 7.4)
    c.setFillColor(MUTED)
    c.drawRightString(W - M - 7 * mm, y - 20 * mm, 'Valor referencial de 1,5 UF, redondeado hacia arriba a miles')
    y -= 34 * mm
    y = p(c, '<b>Entre:</b> Prof3sional Chile SpA, RUT 76.424.312-9, domiciliada en Av. Miraflores 2000, Peñaflor, representada legalmente por don Carlos Rodrigo Rodríguez Silva, RUT 17.660.908-7, en adelante el “Prestador”; y', M, y, style=body)
    # client fields
    c.setFillColor(DARK); c.setFont(FONT_BOLD, 11); c.drawString(M, y, 'Datos del Cliente')
    y -= 10 * mm
    gap = 5 * mm
    half = (CONTENT_W - gap) / 2
    field(c, 'cliente_razon_social', M, y - 11, half, 16, 'Razón social / nombre')
    field(c, 'cliente_rut', M + half + gap, y - 11, half, 16, 'RUT')
    y -= 21 * mm
    field(c, 'cliente_domicilio', M, y - 11, half, 16, 'Domicilio')
    field(c, 'cliente_comuna', M + half + gap, y - 11, half, 16, 'Comuna')
    y -= 21 * mm
    field(c, 'cliente_representante', M, y - 11, half, 16, 'Representante')
    field(c, 'cliente_representante_rut', M + half + gap, y - 11, half, 16, 'RUT representante')
    y -= 21 * mm
    field(c, 'cliente_email', M, y - 11, half, 16, 'Correo de notificaciones')
    field(c, 'cliente_telefono', M + half + gap, y - 11, half, 16, 'Teléfono')
    y -= 24 * mm
    y = p(c, 'Las partes acuerdan celebrar el presente contrato, cuyas condiciones se detallan en las páginas siguientes. Todos los precios indicados en este documento son <b>netos</b> y se adicionarán los impuestos legalmente aplicables.', M, y, style=body_small)
    footer(c, 1); c.showPage()

    # PAGE 2
    header(c, '1. Objeto, alcance y vigencia')
    y = H - 37 * mm
    y = p(c, 'El Prestador proporcionará al Cliente servicios mensuales de infraestructura, soporte técnico y atención de garantía respecto del sitio web <b>fullnesslab.com</b>, en adelante, el “Sitio”. El contrato comenzará a regir el <b>1 de agosto de 2026</b> y se renovará automáticamente por períodos sucesivos de 12 meses.', M, y)
    y = p(c, '<b>Alcance contratado según la propuesta:</b>', M, y, style=subsection)
    y = bullet(c, 'Diseño de sitio web premium, enfocado en experiencia, bienestar y conexión.', M + 3 * mm, y)
    y = bullet(c, 'Desarrollo visual con identidad propia, integración de videos, formularios y llamados a la acción estratégicos.', M + 3 * mm, y)
    y = bullet(c, 'Publicación completa del Sitio.', M + 3 * mm, y)
    y = bullet(c, 'Venta de programas, planes o productos; sistema de suscripciones; integración de pagos online y flujo de compra.', M + 3 * mm, y)
    y -= 2 * mm
    box(c, M, y - 68 * mm, CONTENT_W, 68 * mm, LIGHT, BORDER)
    y_box = y - 8 * mm
    y_box = p(c, '<b>Servicios expresamente excluidos</b>', M + 7 * mm, y_box, CONTENT_W - 14 * mm, subsection)
    excluded = [
        'Plataforma de gestión y seguimiento clínico correspondiente al punto 3 de la propuesta.',
        'Acceso directo del Cliente a la base de datos de Supabase.',
        'Fichas clínicas, historial de clientes, seguimiento clínico o registro nutricional.',
        'Automatización avanzada de correos, informes automáticos y backoffice avanzado.',
        'Facturación electrónica, emisión de boletas o facturas, contabilidad e integración DTE.',
        'Cualquier desarrollo, licencia o servicio no indicado expresamente en este contrato.',
    ]
    for item in excluded:
        y_box = bullet(c, item, M + 9 * mm, y_box, CONTENT_W - 18 * mm)
    y -= 78 * mm
    y = p(c, 'La garantía de correcciones menores asociada a la implementación se regirá por la cláusula tercera. Las mejoras de alcance, nuevas funcionalidades o trabajos no comprendidos en la garantía deberán cotizarse separadamente.', M, y, style=body_small)
    footer(c, 2); c.showPage()

    # PAGE 3
    header(c, '2. Infraestructura y soporte mensual')
    y = H - 37 * mm
    y = p(c, '<b>Infraestructura incluida:</b>', M, y, style=subsection)
    infra = [
        '<b>Vercel:</b> servidor, despliegue y operación técnica del Sitio.',
        '<b>Supabase:</b> base de datos y servicios asociados, administrados por el Prestador.',
        '<b>Cloudflare R2:</b> almacenamiento de archivos mediante sistema compatible con S3.',
    ]
    for item in infra: y = bullet(c, item, M + 3 * mm, y)
    y += 2 * mm
    y = p(c, '<b>Soporte mensual incluido:</b> una (1) hora efectiva mensual para análisis, diagnóstico, configuración, correcciones de funcionamiento, pruebas y validaciones vinculadas al Sitio.', M, y)
    y = p(c, 'La hora mensual no utilizada no se devuelve, no se acumula y no se traslada al mes siguiente. Las horas adicionales se cobrarán a razón de <b>1 UF neta por hora efectiva adicional</b>, previa aprobación escrita del Cliente.', M, y)
    box(c, M, y - 50 * mm, CONTENT_W, 50 * mm, PALE_ORANGE, colors.HexColor('#F3C1AF'))
    yy = y - 8 * mm
    yy = p(c, '<b>Garantía: correcciones menores</b>', M + 7 * mm, yy, CONTENT_W - 14 * mm, subsection)
    yy = p(c, 'La garantía comprende un mes contado desde la entrega del Sitio y cubre ajustes menores, correcciones de errores atribuibles a la implementación y mejoras finas necesarias para completar el alcance contratado.', M + 7 * mm, yy, CONTENT_W - 14 * mm)
    yy = p(c, 'Las correcciones menores de garantía no se imputan a la hora mensual de soporte ni se consideran soporte mensual. La garantía no cubre nuevas funcionalidades, cambios de alcance, modificaciones solicitadas por terceros ni problemas causados por servicios externos, credenciales, contenidos o configuraciones modificadas por el Cliente.', M + 7 * mm, yy, CONTENT_W - 14 * mm)
    y -= 60 * mm
    y = p(c, '<b>Canales disponibles para abrir tickets</b>', M, y, style=subsection)
    y = p(c, 'Las solicitudes podrán realizarse mediante WhatsApp, correo electrónico o ticketera. Las direcciones, números y enlaces respectivos serán informados oportunamente por el Prestador y podrán crearse, modificarse o reemplazarse sin necesidad de modificar este contrato.', M, y, style=body_small)
    y = p(c, 'Correos del Prestador: contacto@prof3sional.com · pagos@prof3sional.com · carlos@prof3sional.com', M, y, style=body_small)
    footer(c, 3); c.showPage()

    # PAGE 4
    header(c, '3. Tickets, estimaciones y reportes')
    y = H - 37 * mm
    paragraphs = [
        'Toda solicitud de soporte deberá ser realizada por uno de los canales informados por el Prestador.',
        'Inmediatamente después de recibida una solicitud, el Prestador informará al Cliente la cantidad estimada de horas efectivas necesarias para atenderla.',
        'La estimación será referencial y podrá actualizarse si durante el diagnóstico aparecen antecedentes técnicos nuevos. No se ejecutarán horas adicionales sin la aprobación previa y escrita del Cliente.',
        'Al finalizar cada ticket, el Prestador informará el resultado, las acciones realizadas y las horas efectivamente utilizadas.',
    ]
    for txt in paragraphs: y = p(c, txt, M, y)
    y -= 2 * mm
    box(c, M, y - 47 * mm, CONTENT_W, 47 * mm, LIGHT, BORDER)
    yy = y - 8 * mm
    yy = p(c, '<b>Registro interno del servicio</b>', M + 7 * mm, yy, CONTENT_W - 14 * mm, subsection)
    yy = p(c, 'El Cliente podrá solicitar un resumen mensual de tickets atendidos, resultado y horas utilizadas. El Prestador conservará los antecedentes razonables de atención durante la vigencia del contrato.', M + 7 * mm, yy, CONTENT_W - 14 * mm)
    y -= 58 * mm
    y = p(c, '<b>Datos para comunicaciones del Cliente</b>', M, y, style=subsection)
    y -= 5 * mm
    field(c, 'cliente_contacto_operativo', M, y - 11, CONTENT_W, 16, 'Persona de contacto operativo')
    y -= 22 * mm
    field(c, 'cliente_correo_tickets', M, y - 11, CONTENT_W, 16, 'Correo adicional para tickets')
    y -= 22 * mm
    field(c, 'cliente_observaciones_operativas', M, y - 49, CONTENT_W, 44, 'Observaciones operativas', multiline=True)
    footer(c, 4); c.showPage()

    # PAGE 5
    header(c, '4. Precio, facturación y mora')
    y = H - 37 * mm
    box(c, M, y - 47 * mm, CONTENT_W, 47 * mm, PALE_ORANGE, colors.HexColor('#F3C1AF'))
    yy = y - 8 * mm
    yy = p(c, '<b>Precio mensual del servicio</b>', M + 7 * mm, yy, CONTENT_W - 14 * mm, subsection)
    yy = p(c, 'El precio mensual es de <b>1,5 UF netas</b>, compuesto por 0,5 UF netas de infraestructura y 1 UF neta de soporte mensual.', M + 7 * mm, yy, CONTENT_W - 14 * mm)
    yy = p(c, 'Para el primer período anual, el valor de 1,5 UF se fija referencialmente en <b>$62.000 netos mensuales</b>. Esta suma corresponde al valor de 1,5 UF convertido a pesos y <b>redondeado hacia arriba a la unidad de mil pesos</b>.', M + 7 * mm, yy, CONTENT_W - 14 * mm)
    y -= 58 * mm
    y = p(c, 'El valor de $62.000 regirá desde el 1 de agosto de 2026 hasta el 31 de julio de 2027. En cada renovación automática de 12 meses, el precio se actualizará aplicando el mismo criterio: valor de 1,5 UF vigente a la fecha de renovación, convertido a pesos y redondeado hacia arriba a la unidad de mil pesos. El valor así determinado regirá durante los 12 meses siguientes.', M, y)
    y = p(c, 'Todos los precios señalados en este contrato son netos. Se adicionarán los impuestos que legalmente correspondan.', M, y)
    y = p(c, '<b>Facturación y pago</b>', M, y, style=subsection)
    y = p(c, 'El servicio se pagará por mes adelantado. La primera factura será emitida y deberá pagarse el día <b>1 de agosto de 2026</b>. Las facturas siguientes se emitirán y pagarán el primer día hábil de cada mes.', M, y)
    y = p(c, 'El pago se realizará mediante suscripción y cargo automático PAC y/o PAT. El Cliente deberá mantener vigente el mandato y los fondos necesarios para efectuar el cobro.', M, y)
    y = p(c, '<b>Mora:</b> el Cliente tendrá un día de gracia. A partir del día siguiente al término del día de gracia se devengará, sobre el monto insoluto, un interés diario equivalente a la tasa máxima convencional vigente y aplicable, calculada sobre base de 360 días.', M, y)
    y = p(c, 'La autorización y los datos operativos del mandato PAC/PAT serán gestionados por el Cliente y el Prestador a través del medio de pago correspondiente, sin necesidad de individualizarlos en este contrato.', M, y, style=body_small)
    footer(c, 5); c.showPage()

    # PAGE 6
    header(c, '5. Suspensión, propiedad y entrega')
    y = H - 37 * mm
    y = p(c, 'Al acumularse dos facturas vencidas e impagas, una vez terminado el respectivo día de gracia, el Prestador podrá suspender la infraestructura, el soporte y la atención de nuevos tickets. La suspensión no extingue las obligaciones de pago, intereses ni demás sumas adeudadas.', M, y)
    y = p(c, '<b>Propiedad.</b> La información, contenidos, productos, textos, imágenes, bases de datos y material proporcionado por el Cliente son de propiedad del Cliente. El código y activos desarrollados específicamente para el Sitio serán entregables al Cliente conforme a esta cláusula, sin perjuicio de componentes de terceros sujetos a sus propias licencias.', M, y)
    y = p(c, '<b>Entrega al término.</b> Si el Cliente solicita la entrega de sus activos, el Prestador tendrá un plazo máximo de 30 días corridos desde la recepción de la solicitud escrita.', M, y)
    box(c, M, y - 65 * mm, CONTENT_W, 65 * mm, LIGHT, BORDER)
    yy = y - 8 * mm
    yy = p(c, '<b>Formato de entrega</b>', M + 7 * mm, yy, CONTENT_W - 14 * mm, subsection)
    items = [
        '<b>Base de datos:</b> se entregará en el formato de exportación que Supabase permita entregar.',
        '<b>Archivos almacenados en Cloudflare R2:</b> se entregará un enlace de descarga disponible durante 30 días corridos.',
        '<b>Código fuente:</b> se compartirá mediante la herramienta GitHub, en el repositorio o mecanismo acordado.',
        '<b>Parámetros de configuración:</b> se entregarán mediante un informe escrito.',
    ]
    for item in items: yy = bullet(c, item, M + 9 * mm, yy, CONTENT_W - 18 * mm)
    y -= 77 * mm
    y = p(c, 'La entrega no comprenderá credenciales maestras propias del Prestador ni licencias o servicios de terceros no transferibles. Cuando corresponda, se entregarán instrucciones o configuraciones necesarias para permitir la continuidad del Sitio.', M, y, style=body_small)
    footer(c, 6); c.showPage()

    # PAGE 7
    header(c, '6. Término, confidencialidad y firma')
    y = H - 37 * mm
    y = p(c, '<b>Término por parte del Cliente.</b> El Cliente podrá poner término al contrato en cualquier momento mediante comunicación escrita, sin necesidad de aviso previo. Como el servicio se paga por mes adelantado, el término no dará derecho a devolución proporcional del mes ya pagado. Si la comunicación se recibe antes de la próxima fecha de facturación, no se cobrará el período siguiente.', M, y)
    y = p(c, '<b>Confidencialidad.</b> Las partes mantendrán reserva respecto de la información técnica, comercial, financiera y operativa a la que accedan con ocasión del contrato. Esta obligación continuará vigente después de su término.', M, y)
    y = p(c, '<b>Comunicaciones.</b> Las comunicaciones contractuales se enviarán a los correos indicados en este documento. Los canales operativos de soporte podrán actualizarse e informarse oportunamente sin modificar el contrato.', M, y)
    y = p(c, 'Leído el presente contrato, las partes lo aceptan y firman digitalmente.', M, y)
    y -= 8 * mm
    gap = 12 * mm
    half = (CONTENT_W - gap) / 2
    sig_rect_y = y - 60 * mm
    box(c, M, y - 64 * mm, half, 64 * mm, LIGHT, BORDER)
    box(c, M + half + gap, y - 64 * mm, half, 64 * mm, LIGHT, BORDER)
    yy = y - 9 * mm
    yy = p(c, '<b>EL PRESTADOR</b>', M + 7 * mm, yy, half - 14 * mm, center_small)
    yy = p(c, 'Prof3sional Chile SpA<br/>RUT 76.424.312-9<br/>Carlos Rodrigo Rodríguez Silva<br/>RUT 17.660.908-7', M + 7 * mm, yy, half - 14 * mm, center_small)
    c.setFillColor(MUTED); c.setFont(FONT, 7); c.drawCentredString(M + half/2, y - 51 * mm, 'Firma digital')
    c.setFillColor(DARK); c.setStrokeColor(BORDER); c.rect(M + 13 * mm, y - 60 * mm, half - 26 * mm, 16 * mm, fill=0, stroke=1)
    yy2 = y - 9 * mm
    yy2 = p(c, '<b>EL CLIENTE</b>', M + half + gap + 7 * mm, yy2, half - 14 * mm, center_small)
    yy2 = p(c, 'Razón social / nombre del Cliente<br/>RUT del Cliente<br/>Representante<br/>RUT representante', M + half + gap + 7 * mm, yy2, half - 14 * mm, center_small)
    c.setFillColor(MUTED); c.setFont(FONT, 7); c.drawCentredString(M + half + gap + half/2, y - 51 * mm, 'Firma digital')
    c.setFillColor(DARK); c.setStrokeColor(BORDER); c.rect(M + half + gap + 13 * mm, y - 60 * mm, half - 26 * mm, 16 * mm, fill=0, stroke=1)
    y -= 75 * mm
    field(c, 'fecha_firma', M, y - 11, half, 16, 'Fecha de firma')
    field(c, 'ciudad_firma', M + half + gap, y - 11, half, 16, 'Ciudad de firma')
    footer(c, 7); c.showPage()
    c.save()

    # Add actual empty PDF signature widgets to the two visual signature boxes.
    reader = PdfReader(str(TMP))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    # Coordinates use bottom-left origin in points. Signature rectangles match the drawn boxes.
    add_sig_field(writer, 6, 'firma_digital_prestador', [M + 13 * mm, sig_rect_y, M + half - 13 * mm, sig_rect_y + 16 * mm])
    add_sig_field(writer, 6, 'firma_digital_cliente', [M + half + gap + 13 * mm, sig_rect_y, M + half + gap + half - 13 * mm, sig_rect_y + 16 * mm])
    with open(OUT, 'wb') as f:
        writer.write(f)


if __name__ == '__main__':
    draw_pdf()
    print(OUT)
