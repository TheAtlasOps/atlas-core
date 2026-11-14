#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador Automatizado de Entregables Capstone:
- Documento 4: Manual de Usuario Final
- Documento 5: Manual de Implementación
- Documento 6: Checklist de Término del Proyecto

Genera tanto las versiones Markdown (.md) como los documentos Word (.docx)
utilizando la plantilla institucional Duoc UC.
"""

import os
import sys
import zipfile
import xml.etree.ElementTree as ET

# Importar utilidades base de build_defects_docx
from build_defects_docx import w_tag, make_p, make_cell, make_table, W_NS

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ATLAS_CORE_DIR = os.path.dirname(SCRIPT_DIR)
TEMPLATE_PATH = os.path.join(ATLAS_CORE_DIR, "docs", "Fase 2 Capstone", "Evidencia Proyecto", "Product_Backlog.docx")

DEST_DIRS = [
    os.path.join(ATLAS_CORE_DIR, "docs", "Fase 2 Capstone", "Evidencia Proyecto"),
    os.path.join(ATLAS_CORE_DIR, "docs")
]

def make_project_box(doc_title, doc_code):
    tbl = ET.Element(w_tag("tbl"))
    tblPr = ET.SubElement(tbl, w_tag("tblPr"))
    tblW = ET.SubElement(tblPr, w_tag("tblW"))
    tblW.set(w_tag("w"), "0")
    tblW.set(w_tag("type"), "auto")
    jc = ET.SubElement(tblPr, w_tag("jc"))
    jc.set(w_tag("val"), "center")

    tblBorders = ET.SubElement(tblPr, w_tag("tblBorders"))
    for b_name in ("top", "left", "bottom", "right", "insideH"):
        b = ET.SubElement(tblBorders, w_tag(b_name))
        b.set(w_tag("val"), "single")
        b.set(w_tag("sz"), "6" if b_name != "insideH" else "4")
        b.set(w_tag("space"), "0")
        b.set(w_tag("color"), "9CC2E5")

    tblLook = ET.SubElement(tblPr, w_tag("tblLook"))
    tblLook.set(w_tag("val"), "04A0")
    tblLook.set(w_tag("firstRow"), "1")
    tblLook.set(w_tag("lastRow"), "0")
    tblLook.set(w_tag("firstColumn"), "1")
    tblLook.set(w_tag("lastColumn"), "0")
    tblLook.set(w_tag("noHBand"), "0")
    tblLook.set(w_tag("noVBand"), "1")

    tblGrid = ET.SubElement(tbl, w_tag("tblGrid"))
    col = ET.SubElement(tblGrid, w_tag("gridCol"))
    col.set(w_tag("w"), "8842")

    # Row 0: Header
    tr0 = ET.SubElement(tbl, w_tag("tr"))
    trPr0 = ET.SubElement(tr0, w_tag("trPr"))
    trJc0 = ET.SubElement(trPr0, w_tag("jc"))
    trJc0.set(w_tag("val"), "center")
    
    tc0 = ET.Element(w_tag("tc"))
    tcPr0 = ET.SubElement(tc0, w_tag("tcPr"))
    tcW0 = ET.SubElement(tcPr0, w_tag("tcW"))
    tcW0.set(w_tag("w"), "8842")
    tcW0.set(w_tag("type"), "dxa")
    shd0 = ET.SubElement(tcPr0, w_tag("shd"))
    shd0.set(w_tag("val"), "clear")
    shd0.set(w_tag("color"), "auto")
    shd0.set(w_tag("fill"), "DDEBF7")

    tcMar0 = ET.SubElement(tcPr0, w_tag("tcMar"))
    for m_name, m_val in (("top", "80"), ("left", "140"), ("bottom", "80"), ("right", "140")):
        m = ET.SubElement(tcMar0, w_tag(m_name))
        m.set(w_tag("w"), m_val)
        m.set(w_tag("type"), "dxa")

    vAlign0 = ET.SubElement(tcPr0, w_tag("vAlign"))
    vAlign0.set(w_tag("val"), "center")

    p0 = make_p(style=None, runs=[{
        "text": f"Identificación del Documento y Equipo de Proyecto | {doc_code}: {doc_title}",
        "bold": True,
        "color": "1F4E79",
        "size": 20
    }], space_after=0, is_table_cell=True)
    tc0.append(p0)
    tr0.append(tc0)

    # Row 1: Content
    tr1 = ET.SubElement(tbl, w_tag("tr"))
    trPr1 = ET.SubElement(tr1, w_tag("trPr"))
    trJc1 = ET.SubElement(trPr1, w_tag("jc"))
    trJc1.set(w_tag("val"), "center")

    tc1 = ET.Element(w_tag("tc"))
    tcPr1 = ET.SubElement(tc1, w_tag("tcPr"))
    tcW1 = ET.SubElement(tcPr1, w_tag("tcW"))
    tcW1.set(w_tag("w"), "8842")
    tcW1.set(w_tag("type"), "dxa")
    shd1 = ET.SubElement(tcPr1, w_tag("shd"))
    shd1.set(w_tag("val"), "clear")
    shd1.set(w_tag("color"), "auto")
    shd1.set(w_tag("fill"), "F8FBFD")

    tcMar1 = ET.SubElement(tcPr1, w_tag("tcMar"))
    for m_name, m_val in (("top", "100"), ("left", "140"), ("bottom", "100"), ("right", "140")):
        m = ET.SubElement(tcMar1, w_tag(m_name))
        m.set(w_tag("w"), m_val)
        m.set(w_tag("type"), "dxa")

    vAlign1 = ET.SubElement(tcPr1, w_tag("vAlign"))
    vAlign1.set(w_tag("val"), "center")

    p1 = ET.Element(w_tag("p"))
    pPr1 = ET.SubElement(p1, w_tag("pPr"))
    sp1 = ET.SubElement(pPr1, w_tag("spacing"))
    sp1.set(w_tag("after"), "0")

    runs_data = [
        ("Equipo de Desarrollo: ", True, "1F4E79"),
        ("Diego Bastián Jiménez Escobar (Frontend & PWA), Joaquín Ignacio Mendoza Arias (Backend & APIs), Alexander Andrés Sáez López (Modelado & Gestión de Base de Datos e Infraestructura) y Matías Ignacio Abarca Contreras (App Técnica PWA / QA).", False, "17365D"),
        ("__BR__", False, None),
        ("Instancia de Evaluación: ", True, "1F4E79"),
        ("Proyecto Capstone, Fase 2 | Docente Guía: Erwin Aguilera | Entorno: Entel B2B (Caso Aplicado).", False, "17365D"),
        ("__BR__", False, None),
        ("Versión del Entregable: ", True, "1F4E79"),
        ("Versión 3.3 (Cierre Final de Proyecto) | Fecha de Emisión: Noviembre 2026 | Estado: Aprobado.", False, "17365D")
    ]
    for text, bold, color in runs_data:
        r = ET.SubElement(p1, w_tag("r"))
        if text == "__BR__":
            ET.SubElement(r, w_tag("br"))
            continue
        rPr = ET.SubElement(r, w_tag("rPr"))
        rFonts = ET.SubElement(rPr, w_tag("rFonts"))
        rFonts.set(w_tag("ascii"), "Calibri")
        rFonts.set(w_tag("hAnsi"), "Calibri")
        if bold:
            ET.SubElement(rPr, w_tag("b"))
        if color:
            c = ET.SubElement(rPr, w_tag("color"))
            c.set(w_tag("val"), color)
        sz = ET.SubElement(rPr, w_tag("sz"))
        sz.set(w_tag("val"), "19")
        t = ET.SubElement(r, w_tag("t"))
        if text.startswith(" ") or text.endswith(" "):
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        t.text = text

    tc1.append(p1)
    tr1.append(tc1)
    return tbl

def compile_docx(doc_title_cover, footer_text, elements_generator_func, output_filename):
    print(f"\n=======================================================")
    print(f"Compilando documento: {output_filename}...")
    with zipfile.ZipFile(TEMPLATE_PATH, "r") as z_in:
        files = {name: z_in.read(name) for name in z_in.namelist()}

    # 1. Modificar footer1.xml
    if "word/footer1.xml" in files:
        footer_xml = files["word/footer1.xml"].decode("utf-8")
        footer_xml = footer_xml.replace("Product", footer_text.split()[0]).replace("Backlog", " ".join(footer_text.split()[1:]))
        files["word/footer1.xml"] = footer_xml.encode("utf-8")
        print(f"  ✅ Pie de página configurado: 'ATLAS | {footer_text}'")

    # 2. Modificar document.xml
    doc_tree = ET.fromstring(files["word/document.xml"])
    namespaces = {"w": W_NS}
    body = doc_tree.find("w:body", namespaces)

    cover_sdt = body[3]
    toc_sdt = body[5]

    for r in cover_sdt.findall(".//w:r", namespaces):
        t = r.find("w:t", namespaces)
        if t is not None and t.text:
            if "Product" in t.text or "Backlog" in t.text:
                t.text = t.text.replace("Product", doc_title_cover.split()[0]).replace("Backlog", " ".join(doc_title_cover.split()[1:]))
            if "12/09/26" in t.text:
                t.text = t.text.replace("12/09/26", "14/11/26")

    new_body_elements = []
    new_body_elements.append(body[0])
    new_body_elements.append(body[1])
    new_body_elements.append(body[2])
    new_body_elements.append(cover_sdt)
    new_body_elements.append(body[4])
    new_body_elements.append(toc_sdt)

    new_body_elements.append(make_p(style="Normal", runs=[], space_after=100))

    # Agregar contenido específico del documento
    elements_generator_func(new_body_elements)

    # Reemplazar elementos del cuerpo conservando el sectPr final
    sectPr = body.find("w:sectPr", namespaces)
    body.clear()
    for el in new_body_elements:
        body.append(el)
    if sectPr is not None:
        body.append(sectPr)

    files["word/document.xml"] = ET.tostring(doc_tree, encoding="utf-8", xml_declaration=True)

    # Guardar en ambas carpetas
    for dest_dir in DEST_DIRS:
        os.makedirs(dest_dir, exist_ok=True)
        out_path = os.path.join(dest_dir, output_filename)
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z_out:
            for name, content in files.items():
                z_out.writestr(name, content)
        print(f"  🎉 Guardado exitoso: {out_path} ({os.path.getsize(out_path)} bytes)")

print("Helper generator module initialized.")
