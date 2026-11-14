#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Documento 3: Registro y Seguimiento de Defectos por Ciclos
en formato Microsoft Word (.docx), preservando el formato institucional de Duoc UC.
"""

import os
import zipfile
import xml.etree.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
ET.register_namespace("w", W_NS)

def w_tag(name):
    return f"{{{W_NS}}}{name}"

def make_p(style="Normal", runs=None, jc=None, space_after=120, is_table_cell=False):
    p = ET.Element(w_tag("p"))
    pPr = ET.SubElement(p, w_tag("pPr"))
    if style and not is_table_cell:
        pStyle = ET.SubElement(pPr, w_tag("pStyle"))
        pStyle.set(w_tag("val"), style)
    if jc:
        j = ET.SubElement(pPr, w_tag("jc"))
        j.set(w_tag("val"), jc)
    if space_after is not None:
        sp = ET.SubElement(pPr, w_tag("spacing"))
        sp.set(w_tag("after"), str(space_after))
        if not is_table_cell:
            sp.set(w_tag("line"), "240")
            sp.set(w_tag("lineRule"), "auto")

    if runs:
        for r_data in runs:
            text = r_data.get("text", "")
            bold = r_data.get("bold", False)
            italic = r_data.get("italic", False)
            color = r_data.get("color", None)
            size = r_data.get("size", None)

            r = ET.SubElement(p, w_tag("r"))
            rPr = ET.SubElement(r, w_tag("rPr"))
            rFonts = ET.SubElement(rPr, w_tag("rFonts"))
            rFonts.set(w_tag("ascii"), "Calibri")
            rFonts.set(w_tag("hAnsi"), "Calibri")
            if bold:
                ET.SubElement(rPr, w_tag("b"))
            if italic:
                ET.SubElement(rPr, w_tag("i"))
            if color:
                c = ET.SubElement(rPr, w_tag("color"))
                c.set(w_tag("val"), color)
            if size:
                s = ET.SubElement(rPr, w_tag("sz"))
                s.set(w_tag("val"), str(size))

            t = ET.SubElement(r, w_tag("t"))
            if text.startswith(" ") or text.endswith(" "):
                t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            t.text = text
    return p

def make_cell(text="", width=None, bg_color=None, bold=False, italic=False, color="17365D", jc="left", size=18):
    tc = ET.Element(w_tag("tc"))
    tcPr = ET.SubElement(tc, w_tag("tcPr"))
    if width:
        tcW = ET.SubElement(tcPr, w_tag("tcW"))
        tcW.set(w_tag("w"), str(width))
        tcW.set(w_tag("type"), "dxa")

    if bg_color:
        shd = ET.SubElement(tcPr, w_tag("shd"))
        shd.set(w_tag("val"), "clear")
        shd.set(w_tag("color"), "auto")
        shd.set(w_tag("fill"), bg_color)

    # Orden estricto según especificación OpenXML: top, left, bottom, right
    tcMar = ET.SubElement(tcPr, w_tag("tcMar"))
    for m_name, m_val in (("top", "100"), ("left", "120"), ("bottom", "100"), ("right", "120")):
        m = ET.SubElement(tcMar, w_tag(m_name))
        m.set(w_tag("w"), m_val)
        m.set(w_tag("type"), "dxa")

    vAlign = ET.SubElement(tcPr, w_tag("vAlign"))
    vAlign.set(w_tag("val"), "center")

    p = make_p(style=None, runs=[{"text": text, "bold": bold, "italic": italic, "color": color, "size": size}], jc=jc, space_after=0, is_table_cell=True)
    tc.append(p)
    return tc

def make_table(headers, rows, col_widths, header_bg="1F3864", header_color="FFFFFF"):
    tbl = ET.Element(w_tag("tbl"))
    tblPr = ET.SubElement(tbl, w_tag("tblPr"))
    tblW = ET.SubElement(tblPr, w_tag("tblW"))
    tblW.set(w_tag("w"), "0")
    tblW.set(w_tag("type"), "auto")
    jc = ET.SubElement(tblPr, w_tag("jc"))
    jc.set(w_tag("val"), "center")

    # Table Borders por defecto (cuadrícula completa en color negro nativo de Word auto)
    tblBorders = ET.SubElement(tblPr, w_tag("tblBorders"))
    for b_name in ("top", "left", "bottom", "right", "insideH", "insideV"):
        b = ET.SubElement(tblBorders, w_tag(b_name))
        b.set(w_tag("val"), "single")
        b.set(w_tag("sz"), "4")
        b.set(w_tag("space"), "0")
        b.set(w_tag("color"), "auto")

    tblLook = ET.SubElement(tblPr, w_tag("tblLook"))
    tblLook.set(w_tag("val"), "04A0")
    tblLook.set(w_tag("firstRow"), "1")
    tblLook.set(w_tag("lastRow"), "0")
    tblLook.set(w_tag("firstColumn"), "1")
    tblLook.set(w_tag("lastColumn"), "0")
    tblLook.set(w_tag("noHBand"), "0")
    tblLook.set(w_tag("noVBand"), "1")

    tblGrid = ET.SubElement(tbl, w_tag("tblGrid"))
    for w in col_widths:
        col = ET.SubElement(tblGrid, w_tag("gridCol"))
        col.set(w_tag("w"), str(w))

    # Header Row
    tr_h = ET.SubElement(tbl, w_tag("tr"))
    trPr_h = ET.SubElement(tr_h, w_tag("trPr"))
    ET.SubElement(trPr_h, w_tag("tblHeader"))
    ET.SubElement(trPr_h, w_tag("cantSplit"))
    trJc_h = ET.SubElement(trPr_h, w_tag("jc"))
    trJc_h.set(w_tag("val"), "center")

    for idx, h_text in enumerate(headers):
        w = col_widths[idx] if idx < len(col_widths) else 1500
        tc = make_cell(text=h_text, width=w, bg_color=header_bg, bold=True, color=header_color, jc="center", size=19)
        tr_h.append(tc)

    # Data Rows
    for r_idx, row in enumerate(rows):
        tr = ET.SubElement(tbl, w_tag("tr"))
        trPr = ET.SubElement(tr, w_tag("trPr"))
        ET.SubElement(trPr, w_tag("cantSplit"))
        trJc = ET.SubElement(trPr, w_tag("jc"))
        trJc.set(w_tag("val"), "center")

        bg = "F8FBFD" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, cell_text in enumerate(row):
            w = col_widths[c_idx] if c_idx < len(col_widths) else 1500
            align = "center" if c_idx in (0, 1, 3, 4, 5) else "left"
            bold = True if c_idx == 0 else False
            color = "1F4E79" if c_idx == 0 else ("0070C0" if c_idx == 5 else "17365D")
            tc = make_cell(text=cell_text, width=w, bg_color=bg, bold=bold, color=color, jc=align, size=18)
            tr.append(tc)

    return tbl

def make_defect_card(def_id, ciclo, title, sev, prio, resp, ref, desc, root_cause, solution, evidence):
    card_elements = []

    # Title paragraph
    card_elements.append(make_p(style="Ttulo3", runs=[
        {"text": f"{def_id}: {title}", "bold": True, "color": "1F4E79", "size": 22}
    ], space_after=60))

    # Metadata Table
    headers = ["ID", "Ciclo", "Severidad", "Prioridad", "Estado", "Responsable"]
    data_row = [def_id, ciclo, sev, prio, "CERRADO", resp]
    widths = [1100, 1100, 1400, 1100, 1200, 2942]
    tbl = make_table(headers, [data_row], widths, header_bg="1F3864", header_color="FFFFFF")
    card_elements.append(tbl)

    # Spacer
    card_elements.append(make_p(style="Normal", runs=[], space_after=60))

    # Field paragraphs
    card_elements.append(make_p(style="Normal", runs=[
        {"text": "Descripción del Defecto: ", "bold": True, "color": "1F497D"},
        {"text": desc, "color": "333333"}
    ], space_after=60))

    card_elements.append(make_p(style="Normal", runs=[
        {"text": "Causa Raíz: ", "bold": True, "color": "C00000"},
        {"text": root_cause, "color": "333333"}
    ], space_after=60))

    card_elements.append(make_p(style="Normal", runs=[
        {"text": "Solución Técnica Implementada: ", "bold": True, "color": "276A3C"},
        {"text": solution, "color": "333333"}
    ], space_after=60))

    card_elements.append(make_p(style="Normal", runs=[
        {"text": "Evidencia y Trazabilidad: ", "bold": True, "color": "7030A0"},
        {"text": f"{evidence} (Referencia: {ref})", "color": "333333"}
    ], space_after=140))

    return card_elements

if __name__ == "__main__":
    print("Module loaded successfully.")
