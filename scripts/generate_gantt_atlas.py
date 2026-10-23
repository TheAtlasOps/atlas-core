import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_gantt_workbook():
    wb = openpyxl.Workbook()

    # Shared Colors & Styles
    NAVY_TITLE = '1F3864'      # Dark Navy Blue
    NAVY_HEADER = '1F4E79'     # Classic Corporate Blue
    NAVY_SUB = '2E5496'        # Medium Blue
    LIGHT_BLUE_PHASE = 'D9E1F2'# Soft blue tint for phases
    ROW_ALT = 'F9FBFD'         # Soft row background
    WHITE = 'FFFFFF'
    BORDER_GRAY = 'D9D9D9'
    BORDER_DARK = '1F3864'

    # Status Fills
    FILL_COMP = 'E2EFDA'
    FONT_COMP = '375623'
    FILL_PROG = 'FFF2CC'
    FONT_PROG = '833C0C'
    FILL_PLAN = 'EDF2F8'
    FONT_PLAN = '2E5496'
    FILL_HITO1 = 'FCE4D6'
    FONT_HITO1 = 'C00000'
    FILL_HITO2 = 'E8D7F1'
    FONT_HITO2 = '7030A0'

    # Gantt Bars
    BAR_COMP = '2E75B6'
    BAR_PROG = 'ED7D31'
    BAR_PLAN = 'B4C6E7'
    BAR_HITO1 = 'C00000'
    BAR_HITO2 = '7030A0'

    thin_border = Border(
        left=Side(style='thin', color=BORDER_GRAY),
        right=Side(style='thin', color=BORDER_GRAY),
        top=Side(style='thin', color=BORDER_GRAY),
        bottom=Side(style='thin', color=BORDER_GRAY)
    )

    header_border = Border(
        left=Side(style='thin', color='FFFFFF'),
        right=Side(style='thin', color='FFFFFF'),
        top=Side(style='medium', color=BORDER_DARK),
        bottom=Side(style='medium', color=BORDER_DARK)
    )

    # ==========================================
    # SHEET 1: Carta Gantt ATLAS
    # ==========================================
    ws1 = wb.active
    ws1.title = 'Carta Gantt ATLAS'
    ws1.views.sheetView[0].showGridLines = True

    # Header Banners
    ws1.merge_cells('A1:AA1')
    ws1['A1'] = 'PROYECTO ATLAS - SISTEMA DE GESTIÓN Y DESPACHO DE SERVICIOS EN TERRENO (ENTEL B2B)'
    ws1['A1'].font = Font(name='Calibri', size=16, bold=True, color='FFFFFF')
    ws1['A1'].fill = PatternFill(start_color=NAVY_TITLE, end_color=NAVY_TITLE, fill_type='solid')
    ws1['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.row_dimensions[1].height = 28

    ws1.merge_cells('A2:AA2')
    ws1['A2'] = 'PLANIFICACIÓN OPERATIVA Y METODOLOGÍA KANBAN | CARTA GANTT SEMANAL (10/AGOSTO/2026 - 30/NOVIEMBRE/2026)'
    ws1['A2'].font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    ws1['A2'].fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
    ws1['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.row_dimensions[2].height = 20

    ws1.merge_cells('A3:AA3')
    ws1['A3'] = 'Duoc UC - Escuela de Informática y Telecomunicaciones | Proyecto Capstone APT122 | Docente Guía: Claudia Silva | Patrocinador: Entel B2B'
    ws1['A3'].font = Font(name='Calibri', size=10, italic=True, color='333333')
    ws1['A3'].fill = PatternFill(start_color='F2F5F9', end_color='F2F5F9', fill_type='solid')
    ws1['A3'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.row_dimensions[3].height = 18

    ws1.merge_cells('A4:AA4')
    ws1['A4'] = 'Equipo de Proyecto: Alexander Sáez (FullStack & DBA Lead) | Diego Jiménez (Frontend & QA Lead) | Jorge Morales (Scrum Master & DevOps) | Matías Tapia (Backend & Cloud)'
    ws1['A4'].font = Font(name='Calibri', size=9, bold=True, color='1F3864')
    ws1['A4'].fill = PatternFill(start_color='E8EEF5', end_color='E8EEF5', fill_type='solid')
    ws1['A4'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.row_dimensions[4].height = 18

    # Metadata Row 5
    ws1.merge_cells('A5:C5')
    ws1['A5'] = '📅 Inicio: 10-Ago-2026'
    ws1['A5'].font = Font(name='Calibri', size=9, bold=True, color='1F3864')
    ws1['A5'].alignment = Alignment(horizontal='center', vertical='center')

    ws1.merge_cells('D5:F5')
    ws1['D5'] = '⏱ Fecha Corte: 22-Oct-2026 (Semana 11 - 90%)'
    ws1['D5'].font = Font(name='Calibri', size=9, bold=True, color='833C0C')
    ws1['D5'].alignment = Alignment(horizontal='center', vertical='center')

    ws1.merge_cells('G5:I5')
    ws1['G5'] = '★ Hito 1 (Profesora): 16-Nov-2026'
    ws1['G5'].font = Font(name='Calibri', size=9, bold=True, color='C00000')
    ws1['G5'].alignment = Alignment(horizontal='center', vertical='center')

    ws1.merge_cells('J5:M5')
    ws1['J5'] = '🏆 Hito 2 (Comisión Final): 30-Nov-2026'
    ws1['J5'].font = Font(name='Calibri', size=9, bold=True, color='7030A0')
    ws1['J5'].alignment = Alignment(horizontal='center', vertical='center')

    ws1.merge_cells('N5:AA5')
    ws1['N5'] = 'Leyenda: [■ Azul] Completado (100%) | [■ Naranja] En Curso (S11) | [■ Celeste] Planificado | [★ Rojo] Hito Docente | [🏆 Morado] Comisión'
    ws1['N5'].font = Font(name='Calibri', size=8, italic=True, color='333333')
    ws1['N5'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.row_dimensions[5].height = 20

    for col in range(1, 28):
        ws1.cell(row=5, column=col).border = Border(bottom=Side(style='medium', color=NAVY_HEADER))

    # Headers for Table
    headers_main = [
        ('ID', 8),
        ('Fase / Macro-Etapa', 22),
        ('Actividad / Entregable Específico', 45),
        ('Metodología / Práctica Ágil', 25),
        ('Responsable', 22),
        ('Inicio', 11),
        ('Fin', 11),
        ('Días', 6),
        ('Estado', 15),
        ('% Avance', 10),
    ]

    for idx, (h_title, w) in enumerate(headers_main, start=1):
        ws1.cell(row=6, column=idx, value=h_title)
        ws1.cell(row=7, column=idx, value='')
        ws1.merge_cells(start_row=6, start_column=idx, end_row=7, end_column=idx)
        ws1.column_dimensions[get_column_letter(idx)].width = w

    weeks_info = [
        ('S01', '10/08 - 16/08'),
        ('S02', '17/08 - 23/08'),
        ('S03', '24/08 - 30/08'),
        ('S04', '31/08 - 06/09'),
        ('S05', '07/09 - 13/09'),
        ('S06', '14/09 - 20/09'),
        ('S07', '21/09 - 27/09'),
        ('S08', '28/09 - 04/10'),
        ('S09', '05/10 - 11/10'),
        ('S10', '12/10 - 18/10'),
        ('S11*', '19/10 - 25/10'),
        ('S12', '26/10 - 01/11'),
        ('S13', '02/11 - 08/11'),
        ('S14', '09/11 - 15/11'),
        ('S15★', '16/11 - 22/11'),
        ('S16', '23/11 - 29/11'),
        ('S17🏆', '30/11 - 30/11')
    ]

    for idx, (s_name, s_dates) in enumerate(weeks_info, start=11):
        ws1.cell(row=6, column=idx, value=s_name)
        ws1.cell(row=7, column=idx, value=s_dates)
        ws1.column_dimensions[get_column_letter(idx)].width = 9.8

    ws1.row_dimensions[6].height = 20
    ws1.row_dimensions[7].height = 18

    for col in range(1, 28):
        c6 = ws1.cell(row=6, column=col)
        c7 = ws1.cell(row=7, column=col)
        c6.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
        c6.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
        c6.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c6.border = header_border
        
        c7.fill = PatternFill(start_color=NAVY_SUB, end_color=NAVY_SUB, fill_type='solid')
        c7.font = Font(name='Calibri', size=7.5, bold=True, color='FFFFFF')
        c7.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c7.border = header_border

    # Highlighting key weeks
    ws1.cell(row=6, column=21).fill = PatternFill(start_color='C65911', end_color='C65911', fill_type='solid')
    ws1.cell(row=7, column=21).fill = PatternFill(start_color='D56B1B', end_color='D56B1B', fill_type='solid')
    ws1.cell(row=6, column=25).fill = PatternFill(start_color='C00000', end_color='C00000', fill_type='solid')
    ws1.cell(row=7, column=25).fill = PatternFill(start_color='9B0000', end_color='9B0000', fill_type='solid')
    ws1.cell(row=6, column=27).fill = PatternFill(start_color='7030A0', end_color='7030A0', fill_type='solid')
    ws1.cell(row=7, column=27).fill = PatternFill(start_color='592480', end_color='592480', fill_type='solid')

    phases_data = [
        {
            'phase': 'FASE 1: DIAGNÓSTICO OPERACIONAL, ALCANCE Y METODOLOGÍA KANBAN (S01 - S03)',
            'tasks': [
                ('ACT-01', 'Fase 1: Diagnóstico', 'Kickoff del proyecto y análisis de problemática operacional en terreno Entel B2B', 'Alineación de Alcance & Kickoff', 'Alexander Sáez / Equipo', '10/08/2026', '14/08/2026', 5, 'COMPLETADO', 1.0, [1]),
                ('ACT-02', 'Fase 1: Metodología', 'Definición metodológica: Adopción de Kanban puro, límites WIP y métricas de flujo', 'Políticas WIP & Walk the Board', 'Jorge Morales / Scrum Master', '17/08/2026', '21/08/2026', 5, 'COMPLETADO', 1.0, [2]),
                ('ACT-03', 'Fase 1: Procesos FSM', 'Levantamiento de requerimientos funcionales, RNFs y modelado formal de estados FSM', 'Modelado FSM & Matriz RNF', 'Diego Jiménez / Alexander Sáez', '24/08/2026', '28/08/2026', 5, 'COMPLETADO', 1.0, [3]),
            ]
        },
        {
            'phase': 'FASE 2: ARQUITECTURA CLOUD, MODELADO RELACIONAL Y PROTOTIPADO (S04 - S07)',
            'tasks': [
                ('ACT-04', 'Fase 2: UI Prototipado', 'Diseño de experiencia UI/UX: Prototipado Dispatch Board y Portal Cliente Magic Links', 'Prototipado UI/UX & Tailwind', 'Diego Jiménez / Frontend', '31/08/2026', '04/09/2026', 5, 'COMPLETADO', 1.0, [4]),
                ('ACT-05', 'Fase 2: Persistencia', 'Modelado DER en 3FN, esquema PostgreSQL en Neon Serverless y dataset semilla (seed.sql)', 'Modelado Relacional 3FN / UUIDv4', 'Alexander Sáez / DBA Lead', '07/09/2026', '11/09/2026', 5, 'COMPLETADO', 1.0, [5]),
                ('ACT-06', 'Fase 2: CI/CD Cloud', 'Automatización de CI/CD en GitHub Actions: Pipelines database-dev.yml y database-prod.yml', 'DevOps & Branching Strategy', 'Alexander Sáez / DevOps', '14/09/2026', '18/09/2026', 5, 'COMPLETADO', 1.0, [6]),
                ('ACT-07', 'Fase 2: Consolidación', 'Receso Fiestas Patrias: Consolidación documental de arquitectura y diseño en Markdown', 'Revisión Asíncrona & Docs', 'Equipo Atlas', '21/09/2026', '25/09/2026', 5, 'COMPLETADO', 1.0, [7]),
            ]
        },
        {
            'phase': 'FASE 3: DESARROLLO CORE FRONTEND & BACKEND API (S08 - S11)',
            'tasks': [
                ('ACT-08', 'Fase 3: Dispatcher UI', 'Construcción de la vista Dispatcher: Filtros por cuadrante, buscador en vivo y sincronización', 'Componentes React & Custom Hooks', 'Diego Jiménez / Alexander Sáez', '28/09/2026', '02/10/2026', 5, 'COMPLETADO', 1.0, [8]),
                ('ACT-09', 'Fase 3: Design System', 'Sistema de diseño corporativo: Modo Claro/Oscuro, modal de perfil y optimización de contraste', 'Accesibilidad WCAG 2.1 & CSS', 'Diego Jiménez / Frontend', '05/10/2026', '09/10/2026', 5, 'COMPLETADO', 1.0, [9]),
                ('ACT-10', 'Fase 3: Backend Core', 'Desarrollo Backend FastAPI: Modelos SQLAlchemy 2.0, autenticación JWT, RBAC y PgBouncer', 'API RESTful & ORM Mapping', 'Alexander Sáez / Backend Lead', '12/10/2026', '16/10/2026', 5, 'COMPLETADO', 1.0, [10]),
                ('ACT-11', 'Fase 3: Integración', 'Integración Live Data: Conexión frontend-backend-Neon DB 100% en vivo y conector SendGrid', 'FullStack Integration & Mock Purge', 'Alexander Sáez / Diego Jiménez', '19/10/2026', '23/10/2026', 5, 'EN CURSO', 0.90, [11]),
            ]
        },
        {
            'phase': 'FASE 4: PRUEBAS DE CALIDAD, PILOTO OPERATIVO Y PRE-ENTREGA DOCENTE (S12 - S15)',
            'tasks': [
                ('ACT-12', 'Fase 4: QA & Seguridad', 'Pruebas de integración E2E, auditoría de seguridad en tokens Magic Links y estrés DB (<50ms)', 'Testing E2E & Latency Benchmarks', 'Alexander Sáez / QA Lead', '26/10/2026', '30/10/2026', 5, 'PLANIFICADO', 0.0, [12]),
                ('ACT-13', 'Fase 4: Piloto Simulado', 'Ejecución de piloto operativo simulado con órdenes de terreno reales y medición de KPIs', 'Simulación Piloto & KPIs SLA', 'Equipo Atlas', '02/11/2026', '06/11/2026', 5, 'PLANIFICADO', 0.0, [13]),
                ('ACT-14', 'Fase 4: Consolidación', 'Consolidación de entregables Capstone, informes de ingeniería y preparación de diapositivas', 'Documentación & Storytelling', 'Equipo Atlas', '09/11/2026', '13/11/2026', 5, 'PLANIFICADO', 0.0, [14]),
                ('HITO-01', 'Hito Intermedio', '★ PRESENTACIÓN INTERMEDIA CON PROFESORA GUÍA: Revisión técnica y levantamiento de observaciones', 'Revisión Docente Capstone', 'Equipo Completo & Claudia Silva', '16/11/2026', '16/11/2026', 1, 'HITO CRÍTICO', 0.0, [15]),
                ('ACT-15', 'Fase 4: Minuta Feedback', 'Registro formal de minuta de feedback docente y priorización de ajustes en tablero Kanban', 'Gestión de Feedback & Kaizen', 'Jorge Morales / Scrum Master', '17/11/2026', '20/11/2026', 4, 'PLANIFICADO', 0.0, [15]),
            ]
        },
        {
            'phase': 'FASE 5: SUBSANACIÓN DE OBSERVACIONES, ENSAYOS Y DEFENSA FINAL (S16 - S17)',
            'tasks': [
                ('ACT-16', 'Fase 5: Cierre & Ajustes', 'Resolución integral de observaciones recibidas de la profesora y congelamiento de código', 'Code Freeze & Polish Final', 'Alexander Sáez / Diego Jiménez', '23/11/2026', '27/11/2026', 5, 'PLANIFICADO', 0.0, [16]),
                ('ACT-17', 'Fase 5: Dry Run', 'Ensayo general de defensa (Dry Run), respaldo de base de datos offline y pruebas de oratoria', 'Dry Run & Plan de Contingencia', 'Equipo Atlas', '28/11/2026', '29/11/2026', 2, 'PLANIFICADO', 0.0, [16]),
                ('HITO-02', 'Hito Final Titulación', '🏆 PRESENTACIÓN Y DEFENSA FINAL ANTE LA COMISIÓN EVALUADORA DE TÍTULO DUOC UC', 'Defensa de Título Capstone', 'Equipo Completo & Comisión Duoc', '30/11/2026', '30/11/2026', 1, 'HITO FINAL', 0.0, [17]),
            ]
        }
    ]

    curr_row = 8
    task_rows_indices = []

    for p_idx, p_data in enumerate(phases_data, start=1):
        ws1.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=27)
        phase_cell = ws1.cell(row=curr_row, column=1, value=p_data['phase'])
        phase_cell.font = Font(name='Calibri', size=10, bold=True, color='1F3864')
        phase_cell.fill = PatternFill(start_color=LIGHT_BLUE_PHASE, end_color=LIGHT_BLUE_PHASE, fill_type='solid')
        phase_cell.alignment = Alignment(horizontal='left', vertical='center', indent=1)
        ws1.row_dimensions[curr_row].height = 22
        for c in range(1, 28):
            ws1.cell(row=curr_row, column=c).border = Border(top=Side(style='thin', color='B4C6E7'), bottom=Side(style='thin', color='B4C6E7'))
        curr_row += 1
        
        for t_idx, t in enumerate(p_data['tasks']):
            task_rows_indices.append(curr_row)
            t_id, t_phase, t_desc, t_method, t_resp, t_ini, t_fin, t_dias, t_estado, t_pct, t_weeks = t
            
            is_even = (t_idx % 2 == 0)
            row_fill = WHITE if is_even else ROW_ALT
            
            ws1.row_dimensions[curr_row].height = 19
            
            c = ws1.cell(row=curr_row, column=1, value=t_id)
            c.font = Font(name='Calibri', size=9, bold=('HITO' in t_id), color='1F3864' if 'HITO' not in t_id else ('C00000' if t_id == 'HITO-01' else '7030A0'))
            c.alignment = Alignment(horizontal='center', vertical='center')
            
            c = ws1.cell(row=curr_row, column=2, value=t_phase)
            c.font = Font(name='Calibri', size=8.5, color='333333')
            c.alignment = Alignment(horizontal='left', vertical='center')
            
            c = ws1.cell(row=curr_row, column=3, value=t_desc)
            c.font = Font(name='Calibri', size=9, bold=('HITO' in t_id), color='1F3864' if 'HITO' not in t_id else ('C00000' if t_id == 'HITO-01' else '7030A0'))
            c.alignment = Alignment(horizontal='left', vertical='center')
            
            c = ws1.cell(row=curr_row, column=4, value=t_method)
            c.font = Font(name='Calibri', size=8.5, italic=True, color='555555')
            c.alignment = Alignment(horizontal='left', vertical='center')
            
            c = ws1.cell(row=curr_row, column=5, value=t_resp)
            c.font = Font(name='Calibri', size=8.5, color='333333')
            c.alignment = Alignment(horizontal='left', vertical='center')
            
            c = ws1.cell(row=curr_row, column=6, value=t_ini)
            c.font = Font(name='Calibri', size=8.5, color='333333')
            c.alignment = Alignment(horizontal='center', vertical='center')
            
            c = ws1.cell(row=curr_row, column=7, value=t_fin)
            c.font = Font(name='Calibri', size=8.5, color='333333')
            c.alignment = Alignment(horizontal='center', vertical='center')
            
            c = ws1.cell(row=curr_row, column=8, value=t_dias)
            c.font = Font(name='Calibri', size=8.5, bold=True, color='333333')
            c.alignment = Alignment(horizontal='center', vertical='center')
            
            c = ws1.cell(row=curr_row, column=9, value=t_estado)
            c.alignment = Alignment(horizontal='center', vertical='center')
            if t_estado == 'COMPLETADO':
                c.fill = PatternFill(start_color=FILL_COMP, end_color=FILL_COMP, fill_type='solid')
                c.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_COMP)
            elif t_estado == 'EN CURSO':
                c.fill = PatternFill(start_color=FILL_PROG, end_color=FILL_PROG, fill_type='solid')
                c.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_PROG)
            elif t_estado == 'PLANIFICADO':
                c.fill = PatternFill(start_color=FILL_PLAN, end_color=FILL_PLAN, fill_type='solid')
                c.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_PLAN)
            elif t_estado == 'HITO CRÍTICO':
                c.fill = PatternFill(start_color=FILL_HITO1, end_color=FILL_HITO1, fill_type='solid')
                c.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_HITO1)
            elif t_estado == 'HITO FINAL':
                c.fill = PatternFill(start_color=FILL_HITO2, end_color=FILL_HITO2, fill_type='solid')
                c.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_HITO2)
                
            c = ws1.cell(row=curr_row, column=10, value=t_pct)
            c.number_format = '0%'
            c.font = Font(name='Calibri', size=8.5, bold=True, color='333333')
            c.alignment = Alignment(horizontal='center', vertical='center')
            
            for col_idx in range(1, 11):
                cell = ws1.cell(row=curr_row, column=col_idx)
                cell.border = thin_border
                if col_idx != 9 and cell.fill.fill_type is None:
                    cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')
                    
            for w_num in range(1, 18):
                g_col = 10 + w_num
                g_cell = ws1.cell(row=curr_row, column=g_col)
                g_cell.border = thin_border
                
                if w_num == 11 and w_num not in t_weeks:
                    g_cell.fill = PatternFill(start_color='FFF9E6', end_color='FFF9E6', fill_type='solid')
                elif w_num == 15 and w_num not in t_weeks:
                    g_cell.fill = PatternFill(start_color='FFF0F0', end_color='FFF0F0', fill_type='solid')
                elif w_num == 17 and w_num not in t_weeks:
                    g_cell.fill = PatternFill(start_color='F5EEF8', end_color='F5EEF8', fill_type='solid')
                elif w_num not in t_weeks:
                    g_cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')
                    
                if w_num in t_weeks:
                    if t_estado == 'COMPLETADO':
                        g_cell.fill = PatternFill(start_color=BAR_COMP, end_color=BAR_COMP, fill_type='solid')
                        g_cell.value = '✔ 100%'
                        g_cell.font = Font(name='Calibri', size=7.5, bold=True, color='FFFFFF')
                        g_cell.alignment = Alignment(horizontal='center', vertical='center')
                    elif t_estado == 'EN CURSO':
                        g_cell.fill = PatternFill(start_color=BAR_PROG, end_color=BAR_PROG, fill_type='solid')
                        g_cell.value = '► 90%'
                        g_cell.font = Font(name='Calibri', size=7.5, bold=True, color='FFFFFF')
                        g_cell.alignment = Alignment(horizontal='center', vertical='center')
                    elif t_estado == 'PLANIFICADO':
                        g_cell.fill = PatternFill(start_color=BAR_PLAN, end_color=BAR_PLAN, fill_type='solid')
                        g_cell.value = '░ Plan'
                        g_cell.font = Font(name='Calibri', size=7.5, color='1F3864')
                        g_cell.alignment = Alignment(horizontal='center', vertical='center')
                    elif t_estado == 'HITO CRÍTICO':
                        g_cell.fill = PatternFill(start_color=BAR_HITO1, end_color=BAR_HITO1, fill_type='solid')
                        g_cell.value = '★ HITO'
                        g_cell.font = Font(name='Calibri', size=7.5, bold=True, color='FFFFFF')
                        g_cell.alignment = Alignment(horizontal='center', vertical='center')
                    elif t_estado == 'HITO FINAL':
                        g_cell.fill = PatternFill(start_color=BAR_HITO2, end_color=BAR_HITO2, fill_type='solid')
                        g_cell.value = '🏆 FINAL'
                        g_cell.font = Font(name='Calibri', size=7.5, bold=True, color='FFFFFF')
                        g_cell.alignment = Alignment(horizontal='center', vertical='center')
                        
            curr_row += 1

    # Summary Row
    ws1.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=7)
    ws1.cell(row=curr_row, column=1, value='TOTALES / PROMEDIO GENERAL DE AVANCE DEL PROYECTO ATLAS')
    ws1.cell(row=curr_row, column=1).font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
    ws1.cell(row=curr_row, column=1).fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
    ws1.cell(row=curr_row, column=1).alignment = Alignment(horizontal='right', vertical='center')

    # Sum of days for tasks
    task_days_formula = '+'.join([f'H{r}' for r in task_rows_indices])
    ws1.cell(row=curr_row, column=8, value='=' + task_days_formula)
    ws1.cell(row=curr_row, column=8).font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
    ws1.cell(row=curr_row, column=8).fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
    ws1.cell(row=curr_row, column=8).alignment = Alignment(horizontal='center', vertical='center')

    ws1.cell(row=curr_row, column=9, value='82% GLOBAL')
    ws1.cell(row=curr_row, column=9).font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
    ws1.cell(row=curr_row, column=9).fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
    ws1.cell(row=curr_row, column=9).alignment = Alignment(horizontal='center', vertical='center')

    task_pct_formula = f'AVERAGE(' + ','.join([f'J{r}' for r in task_rows_indices]) + ')'
    ws1.cell(row=curr_row, column=10, value='=' + task_pct_formula)
    ws1.cell(row=curr_row, column=10).number_format = '0.0%'
    ws1.cell(row=curr_row, column=10).font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
    ws1.cell(row=curr_row, column=10).fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
    ws1.cell(row=curr_row, column=10).alignment = Alignment(horizontal='center', vertical='center')

    for c_idx in range(11, 28):
        c = ws1.cell(row=curr_row, column=c_idx, value='')
        c.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')

    ws1.row_dimensions[curr_row].height = 22

    # ==========================================
    # SHEET 2: Hitos y Entregables Clave
    # ==========================================
    ws2 = wb.create_sheet(title='Hitos y Entregables Clave')
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells('A1:G1')
    ws2['A1'] = 'PROYECTO ATLAS - MATRIZ DE HITOS CRÍTICOS Y CRITERIOS DE ACEPTACIÓN CAPSTONE'
    ws2['A1'].font = Font(name='Calibri', size=15, bold=True, color='FFFFFF')
    ws2['A1'].fill = PatternFill(start_color=NAVY_TITLE, end_color=NAVY_TITLE, fill_type='solid')
    ws2['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws2.row_dimensions[1].height = 26

    ws2.merge_cells('A2:G2')
    ws2['A2'] = 'GOBERNANZA ACADÉMICA DUOC UC | HITOS SEMESTRALES, PRODUCTOS DE TRABAJO Y VALIDACIONES'
    ws2['A2'].font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
    ws2['A2'].fill = PatternFill(start_color=NAVY_SUB, end_color=NAVY_SUB, fill_type='solid')
    ws2['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws2.row_dimensions[2].height = 20

    milestones_headers = [
        ('ID Hito', 10),
        ('Nombre del Hito', 28),
        ('Fecha Límite', 13),
        ('Fase Asociada', 22),
        ('Entregables Técnicos Principales', 42),
        ('Criterios de Aceptación / Evaluación', 42),
        ('Estado de Cumplimiento', 16)
    ]

    for idx, (h_title, w) in enumerate(milestones_headers, start=1):
        c = ws2.cell(row=4, column=idx, value=h_title)
        c.font = Font(name='Calibri', size=9.5, bold=True, color='FFFFFF')
        c.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = header_border
        ws2.column_dimensions[get_column_letter(idx)].width = w

    ws2.row_dimensions[4].height = 24

    milestones_data = [
        (
            'HITO-01',
            'Kickoff y Aprobación de Alcance',
            '14/08/2026',
            'Fase 1: Diagnóstico',
            'Matriz de Stakeholders, Ficha de Diagnóstico Operativo Entel B2B y Registro de Requerimientos Iniciales.',
            'Aprobación formal del alcance por docente guía y patrocinador; delimitación de órdenes FSM y portal cliente.',
            'COMPLETADO'
        ),
        (
            'HITO-02',
            'Modelado DER y Persistencia Cloud',
            '18/09/2026',
            'Fase 2: Arquitectura',
            'Diagrama DER en 3FN, esquema DDL PostgreSQL en Neon Serverless, dataset semilla (seed.sql) y pipelines CI/CD.',
            '10 tablas operativas en el motor, integridad referencial 100%, ejecución automática de tests en PRs hacia main.',
            'COMPLETADO'
        ),
        (
            'HITO-03',
            'Core FullStack Integrado en Vivo (MVP)',
            '23/10/2026',
            'Fase 3: Desarrollo Core',
            'Backend FastAPI, Frontend React PWA, integración directa con Neon DB sin mocks, conector SendGrid y login RBAC.',
            'Sincronización en tiempo real de tableros Kanban, generación de Magic Links funcionales y despacho operativo sin fallas.',
            'EN CURSO (90%)'
        ),
        (
            'HITO-04',
            '★ REVISIÓN Y CORRECCIÓN CON PROFESORA GUÍA',
            '16/11/2026',
            'Fase 4: Pre-entrega Docente',
            'Plataforma Atlas funcional en producción, informes consolidados de Fase 1 y 2, y presentación previa de defensa.',
            'Retroalimentación formal docente, evaluación de usabilidad, levantamiento de observaciones críticas y firma de pre-aprobación.',
            'HITO CRÍTICO'
        ),
        (
            'HITO-05',
            '🏆 DEFENSA FINAL ANTE COMISIÓN CAPSTONE',
            '30/11/2026',
            'Fase 5: Titulación Final',
            'Sistema Atlas en producción alta disponibilidad (Vercel/Render/Neon), informe final de titulación, demo en vivo y pitch.',
            'Aprobación unánime de la Comisión Evaluadora de Título Duoc UC, validación de cumplimiento de competencias y titulación.',
            'HITO FINAL'
        ),
    ]

    for m_idx, m in enumerate(milestones_data, start=5):
        ws2.row_dimensions[m_idx].height = 42
        is_even = (m_idx % 2 == 0)
        row_fill = WHITE if is_even else ROW_ALT
        
        for c_idx in range(1, 8):
            cell = ws2.cell(row=m_idx, column=c_idx, value=m[c_idx-1])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if c_idx in [1, 3, 7] else 'left', vertical='center', wrap_text=True)
            cell.font = Font(name='Calibri', size=9, bold=(c_idx in [1, 2, 7]), color='1F3864' if c_idx in [1, 2] else '333333')
            cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')
            
            if c_idx == 7:
                st = m[6]
                if 'COMPLETADO' in st:
                    cell.fill = PatternFill(start_color=FILL_COMP, end_color=FILL_COMP, fill_type='solid')
                    cell.font = Font(name='Calibri', size=9, bold=True, color=FONT_COMP)
                elif 'EN CURSO' in st:
                    cell.fill = PatternFill(start_color=FILL_PROG, end_color=FILL_PROG, fill_type='solid')
                    cell.font = Font(name='Calibri', size=9, bold=True, color=FONT_PROG)
                elif 'HITO CRÍTICO' in st:
                    cell.fill = PatternFill(start_color=FILL_HITO1, end_color=FILL_HITO1, fill_type='solid')
                    cell.font = Font(name='Calibri', size=9, bold=True, color=FONT_HITO1)
                elif 'HITO FINAL' in st:
                    cell.fill = PatternFill(start_color=FILL_HITO2, end_color=FILL_HITO2, fill_type='solid')
                    cell.font = Font(name='Calibri', size=9, bold=True, color=FONT_HITO2)

    # ==========================================
    # SHEET 3: Métricas Kanban y Gobernanza
    # ==========================================
    ws3 = wb.create_sheet(title='Métricas Kanban y Gobernanza')
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells('A1:F1')
    ws3['A1'] = 'PROYECTO ATLAS - POLÍTICAS OPERACIONALES KANBAN Y MÉTRICAS DE FLUJO'
    ws3['A1'].font = Font(name='Calibri', size=15, bold=True, color='FFFFFF')
    ws3['A1'].fill = PatternFill(start_color=NAVY_TITLE, end_color=NAVY_TITLE, fill_type='solid')
    ws3['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws3.row_dimensions[1].height = 26

    ws3.merge_cells('A2:F2')
    ws3['A2'] = 'GESTIÓN ÁGIL DE FLUJO CONTINUO | LÍMITES WIP, CODEFLOW Y CADENCIAS DE MEJORA CONTINUA (KAIZEN)'
    ws3['A2'].font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
    ws3['A2'].fill = PatternFill(start_color=NAVY_SUB, end_color=NAVY_SUB, fill_type='solid')
    ws3['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws3.row_dimensions[2].height = 20

    # Table 1: WIP Limits
    ws3.merge_cells('A4:F4')
    ws3['A4'] = '1. POLÍTICAS DE LÍMITES WIP (WORK IN PROGRESS) EN TABLERO KANBAN ATLAS'
    ws3['A4'].font = Font(name='Calibri', size=11, bold=True, color='1F3864')
    ws3['A4'].fill = PatternFill(start_color=LIGHT_BLUE_PHASE, end_color=LIGHT_BLUE_PHASE, fill_type='solid')
    ws3['A4'].alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws3.row_dimensions[4].height = 22

    wip_headers = [
        ('Columna Tablero', 18),
        ('Límite WIP', 12),
        ('Propósito Operacional / Justificación de Calidad', 40),
        ('Criterio de Entrada (Definition of Ready)', 35),
        ('Criterio de Salida (Definition of Done)', 35),
        ('Estado Actual', 15)
    ]

    for idx, (h_title, w) in enumerate(wip_headers, start=1):
        c = ws3.cell(row=5, column=idx, value=h_title)
        c.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
        c.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = header_border
        ws3.column_dimensions[get_column_letter(idx)].width = w

    ws3.row_dimensions[5].height = 24

    wip_data = [
        ('Backlog', 'Ilimitado', 'Repositorio centralizado de historias y requerimientos priorizados MoSCoW.', 'Historia redactada con criterios de aceptación claros.', 'Item priorizado y seleccionado para refinamiento.', 'OPERATIVO'),
        ('Análisis & Diseño', 'WIP = 3', 'Evitar sobrecarga en especificación y prevenir cuellos de botella iniciales.', 'Historia priorizada en Backlog.', 'Especificación técnica, contrato API Pydantic y prototipo listos.', 'OPERATIVO'),
        ('Desarrollo (In Dev)', 'WIP = 4', 'Garantizar foco del equipo (máximo 1 tarea activa por desarrollador).', 'Contrato API y DER aprobados, rama creada bajo CodeFlow.', 'Código testeado localmente, sin linter errors, commit semántico.', 'OPERATIVO'),
        ('Code Review (PR)', 'WIP = 2', 'Revisión técnica cruzada obligatoria para asegurar estándares de calidad.', 'Pull Request abierto hacia rama de integración con descripción.', 'Aprobación de al menos un par y checks de CI/CD en verde.', 'OPERATIVO'),
        ('Testing & QA', 'WIP = 3', 'Validación funcional en entorno de staging contra base Neon dev.', 'PR fusionado a dev y desplegado automáticamente.', 'Pruebas E2E y de regresión aprobadas sin defectos bloqueantes.', 'OPERATIVO'),
        ('Desplegado (Done)', 'Ilimitado', 'Incrementos de software operando en producción de alta disponibilidad.', 'Aprobación de QA y pase a producción.', 'Código en producción (Render/Vercel/Neon), telemetría activa.', 'OPERATIVO')
    ]

    for w_idx, row in enumerate(wip_data, start=6):
        ws3.row_dimensions[w_idx].height = 28
        is_even = (w_idx % 2 == 0)
        row_fill = WHITE if is_even else ROW_ALT
        for c_idx in range(1, 7):
            cell = ws3.cell(row=w_idx, column=c_idx, value=row[c_idx-1])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if c_idx in [1, 2, 6] else 'left', vertical='center', wrap_text=True)
            cell.font = Font(name='Calibri', size=8.5, bold=(c_idx in [1, 2]), color='1F3864' if c_idx in [1, 2] else '333333')
            cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')
            if c_idx == 6:
                cell.fill = PatternFill(start_color=FILL_COMP, end_color=FILL_COMP, fill_type='solid')
                cell.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_COMP)

    # Table 2: Quantitative Flow Metrics
    row_t2_start = 14
    ws3.merge_cells(f'A{row_t2_start}:F{row_t2_start}')
    ws3[f'A{row_t2_start}'] = '2. MÉTRICAS CUANTITATIVAS DE FLUJO ÁGIL (OBJETIVO VS REAL)'
    ws3[f'A{row_t2_start}'].font = Font(name='Calibri', size=11, bold=True, color='1F3864')
    ws3[f'A{row_t2_start}'].fill = PatternFill(start_color=LIGHT_BLUE_PHASE, end_color=LIGHT_BLUE_PHASE, fill_type='solid')
    ws3[f'A{row_t2_start}'].alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws3.row_dimensions[row_t2_start].height = 22

    metrics_headers = [
        ('Métrica de Flujo', 22),
        ('Fórmula / Definición de Medición', 35),
        ('Meta Objetivo', 16),
        ('Valor Real (Oct-2026)', 18),
        ('Desviación / Variación', 18),
        ('Evaluación de Desempeño', 18)
    ]

    for idx, (h_title, w) in enumerate(metrics_headers, start=1):
        c = ws3.cell(row=row_t2_start+1, column=idx, value=h_title)
        c.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
        c.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = header_border

    ws3.row_dimensions[row_t2_start+1].height = 22

    metrics_data = [
        ('Lead Time Promedio', 'Tiempo desde creación de ticket hasta despliegue productivo', '<= 4.0 días', '3.2 días', '-20.0% (Más ágil)', 'CUMPLIDO CON ÉXITO'),
        ('Cycle Time Promedio', 'Tiempo activo de trabajo en desarrollo, review y pruebas', '<= 2.5 días', '1.8 días', '-28.0% (Excelente fluidez)', 'CUMPLIDO CON ÉXITO'),
        ('Throughput Semanal', 'Cantidad de tickets terminados y entregados por semana', '4 a 6 tickets/sem', '5.2 tickets/sem', 'En rango óptimo', 'CUMPLIDO CON ÉXITO'),
        ('WIP Activo Total', 'Número de tickets en progreso simultáneo (columnas activas)', '<= 9 tickets', '7 tickets', '-22.2% (Bajo control)', 'CUMPLIDO CON ÉXITO'),
        ('Defect Escape Rate', 'Porcentaje de bugs detectados en producción sobre cerrados', '< 5.0%', '0.0%', '100% de calidad en PRs', 'CUMPLIDO CON ÉXITO')
    ]

    for m_i, row in enumerate(metrics_data, start=row_t2_start+2):
        ws3.row_dimensions[m_i].height = 24
        is_even = (m_i % 2 == 0)
        row_fill = WHITE if is_even else ROW_ALT
        for c_idx in range(1, 7):
            cell = ws3.cell(row=m_i, column=c_idx, value=row[c_idx-1])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if c_idx in [1, 3, 4, 5, 6] else 'left', vertical='center')
            cell.font = Font(name='Calibri', size=8.5, bold=(c_idx in [1, 4, 6]), color='1F3864' if c_idx == 1 else '333333')
            cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')
            if c_idx == 6:
                cell.fill = PatternFill(start_color=FILL_COMP, end_color=FILL_COMP, fill_type='solid')
                cell.font = Font(name='Calibri', size=8.5, bold=True, color=FONT_COMP)

    # Table 3: Agile Cadences
    row_t3_start = 22
    ws3.merge_cells(f'A{row_t3_start}:F{row_t3_start}')
    ws3[f'A{row_t3_start}'] = '3. CADENCIAS Y CEREMONIAS ÁGILES DEL EQUIPO ATLAS'
    ws3[f'A{row_t3_start}'].font = Font(name='Calibri', size=11, bold=True, color='1F3864')
    ws3[f'A{row_t3_start}'].fill = PatternFill(start_color=LIGHT_BLUE_PHASE, end_color=LIGHT_BLUE_PHASE, fill_type='solid')
    ws3[f'A{row_t3_start}'].alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws3.row_dimensions[row_t3_start].height = 22

    cadence_headers = [
        ('Ceremonia / Dinámica', 20),
        ('Frecuencia', 15),
        ('Duración', 12),
        ('Participantes', 25),
        ('Objetivo Operacional en Proyecto Atlas', 45),
        ('Registro / Evidencia', 18)
    ]

    for idx, (h_title, w) in enumerate(cadence_headers, start=1):
        c = ws3.cell(row=row_t3_start+1, column=idx, value=h_title)
        c.font = Font(name='Calibri', size=9, bold=True, color='FFFFFF')
        c.fill = PatternFill(start_color=NAVY_HEADER, end_color=NAVY_HEADER, fill_type='solid')
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = header_border

    ws3.row_dimensions[row_t3_start+1].height = 22

    cadence_data = [
        ('Daily Standup', 'Diaria (Lun a Vie)', '15 min', 'Equipo Atlas completo', 'Sincronizar tareas diarias, coordinar ramas de trabajo y detectar bloqueos inmediatamente.', 'Bitácora Daily en Discord'),
        ('Walk the Board', 'Martes y Jueves', '20 min', 'Equipo Atlas completo', 'Inspección de derecha a izquierda del tablero Kanban para empujar tickets trabados hacia Done.', 'Tablero Kanban GitHub'),
        ('Kaizen Retrospective', 'Quincenal', '45 min', 'Equipo Atlas completo', 'Análisis de causas raíz en desperdicios de tiempo, optimización de pipelines CI/CD y feedback docente.', 'Actas de Retrospectiva'),
        ('CodeFlow Review', 'Bajo Demanda', 'Asíncrono', 'Pares desarrolladores', 'Revisión técnica minuciosa de PRs contra estándares de seguridad, tipado estricto y cobertura.', 'Pull Requests en GitHub')
    ]

    for c_i, row in enumerate(cadence_data, start=row_t3_start+2):
        ws3.row_dimensions[c_i].height = 24
        is_even = (c_i % 2 == 0)
        row_fill = WHITE if is_even else ROW_ALT
        for c_idx in range(1, 7):
            cell = ws3.cell(row=c_i, column=c_idx, value=row[c_idx-1])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if c_idx in [1, 2, 3] else 'left', vertical='center')
            cell.font = Font(name='Calibri', size=8.5, bold=(c_idx == 1), color='1F3864' if c_idx == 1 else '333333')
            cell.fill = PatternFill(start_color=row_fill, end_color=row_fill, fill_type='solid')

    # Save to both destinations
    dest1 = r'C:\Users\Alexander\Desktop\Archivos\Duoc Uc\Proyecto Atlas\atlas-core\docs\Fase 2 Capstone\Evidencia Proyecto\Carta_Gantt_Proyecto_Atlas.xlsx'
    dest2 = r'C:\Users\Alexander\Desktop\Archivos\Duoc Uc\Proyecto Atlas\Documentacion_Entregables_Fase1\Carta_Gantt_Proyecto_Atlas.xlsx'
    
    os.makedirs(os.path.dirname(dest1), exist_ok=True)
    os.makedirs(os.path.dirname(dest2), exist_ok=True)
    
    wb.save(dest1)
    wb.save(dest2)
    print(f'Successfully generated Gantt workbook at:\n1. {dest1}\n2. {dest2}')

if __name__ == '__main__':
    build_gantt_workbook()
