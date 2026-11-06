"""Gera o PDF dos Termos a partir de src/content/termosPrivacidade.ts (mesmo texto exibido no app).
Uso: python gerar_pdf_termos.py <termosPrivacidade.ts> <saida.pdf>
"""
import re, sys
from fpdf import FPDF

src = open(sys.argv[1], encoding='utf8').read()
contato = re.search(r"CONTATO_PRIVACIDADE = '([^']+)'", src).group(1)
ver = re.search(r"TERMS_VERSION = '([^']+)'", src).group(1)
upd = re.search(r"TERMS_UPDATED_AT = '([^']+)'", src).group(1)
intro = re.search(r"TERMS_INTRO =\s*'([^']+)'", src).group(1)
sections = re.findall(r"\{\s*title: '([^']+)',(.*?)\n  \},", src, flags=re.S)


def latin(t):
    # Fonte padrão do PDF usa Latin-1: troca travessões, aspas e marcadores por equivalentes.
    return (t.replace('–', '-').replace('—', '-').replace('“', '"').replace('”', '"')
             .replace('’', "'").replace('•', '-').replace('·', '-'))


pdf = FPDF(format='A4')
pdf.set_auto_page_break(True, margin=18)
pdf.set_margins(20, 18, 20)
pdf.add_page()
pdf.set_font('Helvetica', 'B', 16)
pdf.multi_cell(0, 8, latin('Tio da Perua - Termos de Uso e Política de Privacidade'), new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 9)
pdf.multi_cell(0, 6, latin(f'Versão {ver} - atualizada em {upd}'), new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, latin(intro), new_x="LMARGIN", new_y="NEXT")
for title, block in sections:
    pdf.ln(3)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.multi_cell(0, 7, latin(title), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('Helvetica', '', 11)
    pm = re.search(r'paragraphs: \[(.*?)\],', block, flags=re.S)
    if pm:
        for a, b in re.findall(r"'((?:[^'\\]|\\.)*)'(?:\s*\+\s*CONTATO_PRIVACIDADE\s*\+\s*'((?:[^'\\]|\\.)*)')?", pm.group(1)):
            pdf.multi_cell(0, 6, latin(a + (contato + b if b else '')), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
    im = re.search(r'items: \[(.*?)\],', block, flags=re.S)
    if im:
        for it in re.findall(r"'((?:[^'\\]|\\.)*)'", im.group(1)):
            pdf.set_x(24)
            pdf.multi_cell(0, 6, latin('- ' + it), new_x="LMARGIN", new_y="NEXT")
pdf.output(sys.argv[2])
print('ok', len(sections), 'seções')
