import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Divider, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useProjectContext } from '../context/ProjectContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { toFileName } from '../utils/projectStorage';
import styles from './DrawingWorkspace.module.css';

// Las herramientas se agrupan por función (selección, dibujo, edición,
// medición) para que el panel izquierdo se lea como flujo de trabajo en
// lugar de una lista plana. "Cuadrícula" se retiró de aquí: no era una
// herramienta real (seleccionarla no hacía nada), la cuadrícula se
// controla desde el interruptor de la sección "Vista" más abajo.
const toolGroups = [
  { label: 'Selección', tools: ['Selección'] },
  { label: 'Dibujo', tools: ['Lápiz', 'Línea', 'Rectángulo', 'Círculo'] },
  { label: 'Edición', tools: ['Borrador', 'Eliminar'] },
  { label: 'Medición', tools: ['Escala', 'Medición'] }
];

const tools = toolGroups.flatMap((group) => group.tools);

const initialLayers = ['Capa estructural', 'Capa mobiliario', 'Capa cotas'];
const backgroundColor = '#0a0f18';
const drawingUnit = 'mm';
const gridSpacingPx = 28;
const selectionHandleSize = 7;
const rotationHandleOffset = 26;

// Genera una copia de un trazo para mantener inmutable el estado del canvas.
function cloneShape(shape) {
  return {
    ...shape,
    points: shape.points ? shape.points.map((point) => ({ ...point })) : undefined,
    start: shape.start ? { ...shape.start } : undefined,
    end: shape.end ? { ...shape.end } : undefined
  };
}

// Devuelve la figura provisional adecuada según la herramienta activa.
function buildPreviewShape(tool, startPoint, currentPoint, color, thickness) {
  if (tool === 'Lápiz' || tool === 'Borrador') {
    return {
      tool,
      points: [startPoint, currentPoint],
      color,
      thickness
    };
  }

  return {
    tool,
    start: startPoint,
    end: currentPoint,
    color,
    thickness
  };
}

// Renderiza el lienzo principal y sincroniza el estado de dibujo con el proyecto activo.
export default function DrawingWorkspacePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const drawingRef = useRef(false);
  const draftRef = useRef(null);
  const moveFrameRef = useRef(null);
  const latestPointRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const { settings } = useAppContext();
  const { activeProject, setWorkspaceSnapshot, saveProject, openProject, draftInfo, recoverDraft, discardDraft } = useProjectContext();
  const [activeTool, setActiveTool] = useState('Lápiz');
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [color, setColor] = useState('#58b7ff');
  const [thickness, setThickness] = useState(3);
  // scale handled via scaleRaw/scaleNumeric/scaleRatio
  const [zoom, setZoom] = useState(100);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState(['Proyecto creado en modo simulación']);
  const [layers] = useState(initialLayers);
  const [shapes, setShapes] = useState([]);
  const [previewShape, setPreviewShape] = useState(null);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const dragOriginalRef = useRef(null);
  const transformRef = useRef(null);
  const scalePointRef = useRef(null);
  const measurementPointRef = useRef(null);
  const [measurementPreview, setMeasurementPreview] = useState(null);
  const [scaleRaw, setScaleRaw] = useState(settings.defaultScale);
  const [scaleNumeric, setScaleNumeric] = useState(null); // unidades por pixel
  const [scaleRatio, setScaleRatio] = useState(null); // {num,den,display}
  const [showCartesianView, setShowCartesianView] = useState(true);
  const [coordinateCapture, setCoordinateCapture] = useState({ x1: '', y1: '', x2: '', y2: '' });

  

  useDocumentTitle('Área de dibujo | Sistema híbrido de dibujo arquitectónico');

  useEffect(() => {
    if (!activeProject?.snapshot) {
      setScaleRaw(settings.defaultScale);
      // parse default
      parseScaleInput(settings.defaultScale);
      return;
    }

    const s = activeProject.snapshot.scale || settings.defaultScale;
    setScaleRaw(s);
    parseScaleInput(s);
    setColor(activeProject.snapshot.color || '#58b7ff');
    setThickness(activeProject.snapshot.thickness || 3);
    setZoom(activeProject.snapshot.zoom || 100);
    setHistory(activeProject.snapshot.history || ['Proyecto cargado desde la biblioteca local']);
    setShapes(activeProject.snapshot.shapes || []);
  }, [activeProject, settings.defaultScale]);

  useEffect(() => {
    setWorkspaceSnapshot({
      projectName: activeProject?.name || 'Proyecto de tesis',
      scale: scaleRaw,
      scaleNumeric,
      scaleRatio,
      unit: drawingUnit,
      color,
      thickness,
      zoom,
      activeTool,
      history,
      layers,
      shapes
    });
    // `coordinates` (the live cursor position) is deliberately left out: it's
    // transient UI state, not drawing data, and including it here meant this
    // effect — and the autosave-draft timer and shared ProjectContext value
    // that depend on it — reset on every animation frame while the mouse
    // simply moved over the canvas, even without drawing anything.
  }, [activeProject, activeTool, color, history, layers, scaleRaw, scaleNumeric, scaleRatio, setWorkspaceSnapshot, shapes, thickness, zoom]);

  const getCanvasPoint = useCallback((event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  const drawShape = useCallback((context, shape) => {
    if (!shape) {
      return;
    }

    context.save();

    if (shape.tool === 'Borrador') {
      // Usar pintura con color de fondo para simular borrador de forma robusta
      // (algunos contextos/composiciones pueden comportarse distinto con destination-out).
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = backgroundColor;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = shape.color || color;
    }

    context.lineWidth = shape.tool === 'Borrador' ? (shape.thickness || thickness) * 3.6 : shape.thickness || thickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (shape.tool === 'Lápiz' || shape.tool === 'Borrador') {
      const points = shape.points || [];

      if (points.length < 2) {
        context.restore();
        return;
      }

      context.beginPath();
      context.moveTo(points[0].x, points[0].y);

      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }

      context.stroke();
      context.restore();
      return;
    }

    if (shape.tool === 'Línea') {
      context.beginPath();
      context.moveTo(shape.start.x, shape.start.y);
      context.lineTo(shape.end.x, shape.end.y);
      context.stroke();
      context.restore();
      return;
    }

    if (shape.tool === 'Rectángulo') {
      const left = Math.min(shape.start.x, shape.end.x);
      const top = Math.min(shape.start.y, shape.end.y);
      const width = Math.abs(shape.end.x - shape.start.x);
      const height = Math.abs(shape.end.y - shape.start.y);

      context.strokeRect(left, top, width, height);
      context.restore();
      return;
    }

    if (shape.tool === 'Círculo') {
      const radius = Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y);

      context.beginPath();
      context.arc(shape.start.x, shape.start.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      return;
    }

    context.restore();
  }, [color, thickness]);

  const applyOffset = (point, offset) => ({
    x: point.x + (offset?.x || 0),
    y: point.y + (offset?.y || 0)
  });

  const normalizeCoordinates = (shape) => {
    if (!shape) return shape;

    const clone = cloneShape(shape);
    if (clone.points?.length) {
      clone.points = clone.points.map((point) => ({
        x: Number(point.x) || 0,
        y: Number(point.y) || 0
      }));
    }

    if (clone.start) {
      clone.start = { x: Number(clone.start.x) || 0, y: Number(clone.start.y) || 0 };
    }

    if (clone.end) {
      clone.end = { x: Number(clone.end.x) || 0, y: Number(clone.end.y) || 0 };
    }

    return clone;
  };

  const getShapeCenter = (shape) => {
    if (!shape) {
      return { x: 0, y: 0 };
    }

    if (shape.points?.length) {
      const xs = shape.points.map((point) => point.x);
      const ys = shape.points.map((point) => point.y);
      return {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2
      };
    }

    if (shape.start && shape.end) {
      return {
        x: (shape.start.x + shape.end.x) / 2,
        y: (shape.start.y + shape.end.y) / 2
      };
    }

    return { x: 0, y: 0 };
  };

  const transformPointAroundOrigin = (point, origin, scaleX, scaleY, angleRadians) => {
    const offsetX = point.x - origin.x;
    const offsetY = point.y - origin.y;
    const scaledX = offsetX * scaleX;
    const scaledY = offsetY * scaleY;
    const rotatedX = scaledX * Math.cos(angleRadians) - scaledY * Math.sin(angleRadians);
    const rotatedY = scaledX * Math.sin(angleRadians) + scaledY * Math.cos(angleRadians);

    return {
      x: origin.x + rotatedX,
      y: origin.y + rotatedY
    };
  };

  const transformShapeAroundOrigin = (shape, { origin, scaleX = 1, scaleY = 1, angle = 0 } = {}) => {
    if (!shape) {
      return shape;
    }

    const angleRadians = (angle * Math.PI) / 180;
    const transformed = cloneShape(shape);

    if (transformed.points?.length) {
      transformed.points = transformed.points.map((point) => transformPointAroundOrigin(point, origin, scaleX, scaleY, angleRadians));
    }

    if (transformed.start) {
      transformed.start = transformPointAroundOrigin(transformed.start, origin, scaleX, scaleY, angleRadians);
    }

    if (transformed.end) {
      transformed.end = transformPointAroundOrigin(transformed.end, origin, scaleX, scaleY, angleRadians);
    }

    return transformed;
  };

  const transformShape = (shape, { scaleX = 1, scaleY = 1, angle = 0 } = {}) => transformShapeAroundOrigin(shape, {
    origin: getShapeCenter(shape),
    scaleX,
    scaleY,
    angle
  });

  const translateShape = (shape, dx, dy) => {
    if (!shape) {
      return shape;
    }

    const translated = cloneShape(shape);

    if (translated.points?.length) {
      translated.points = translated.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    }

    if (translated.start) {
      translated.start = { x: translated.start.x + dx, y: translated.start.y + dy };
    }

    if (translated.end) {
      translated.end = { x: translated.end.x + dx, y: translated.end.y + dy };
    }

    return translated;
  };

  function getSelectionBounds(shape) {
    if (!shape) {
      return null;
    }

    if (shape.points?.length) {
      const xs = shape.points.map((point) => point.x);
      const ys = shape.points.map((point) => point.y);

      return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys)
      };
    }

    if (shape.start && shape.end) {
      return {
        left: Math.min(shape.start.x, shape.end.x),
        top: Math.min(shape.start.y, shape.end.y),
        right: Math.max(shape.start.x, shape.end.x),
        bottom: Math.max(shape.start.y, shape.end.y)
      };
    }

    return null;
  }

  function getSelectionHandles(shape) {
    const bounds = getSelectionBounds(shape);

    if (!bounds) {
      return null;
    }

    const centerX = (bounds.left + bounds.right) / 2;
    return {
      bounds,
      corners: {
        nw: { x: bounds.left, y: bounds.top },
        ne: { x: bounds.right, y: bounds.top },
        se: { x: bounds.right, y: bounds.bottom },
        sw: { x: bounds.left, y: bounds.bottom }
      },
      rotate: { x: centerX, y: bounds.top - rotationHandleOffset },
      center: { x: centerX, y: (bounds.top + bounds.bottom) / 2 }
    };
  }

  function isPointNearHandle(point, handle) {
    return Boolean(handle && Math.hypot(point.x - handle.x, point.y - handle.y) <= selectionHandleSize + 2);
  }

  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedShapeId) || null,
    [selectedShapeId, shapes]
  );

  const selectedShapeHandles = useMemo(
    () => getSelectionHandles(selectedShape),
    [selectedShape]
  );

  const oppositeCorner = (corner) => {
    const pairs = {
      nw: 'se',
      ne: 'sw',
      se: 'nw',
      sw: 'ne'
    };

    return pairs[corner] || 'se';
  };

  const applyTransformToSelected = (transform, historyLabel) => {
    if (!selectedShape) {
      setHistory((currentHistory) => ['No hay figura seleccionada para transformar', ...currentHistory].slice(0, 6));
      return;
    }

    setShapes((currentShapes) =>
      currentShapes.map((shape) => {
        if (shape.id !== selectedShapeId) {
          return shape;
        }

        return normalizeCoordinates(transformShape(shape, transform));
      })
    );

    setHistory((currentHistory) => [historyLabel, ...currentHistory].slice(0, 6));
  };

  const deleteSelectedShape = () => {
    if (!selectedShape) {
      setHistory((currentHistory) => ['No hay figura seleccionada para eliminar', ...currentHistory].slice(0, 6));
      return;
    }

    setShapes((currentShapes) => currentShapes.filter((shape) => shape.id !== selectedShapeId));
    setSelectedShapeId(null);
    setHistory((currentHistory) => ['Figura eliminada', ...currentHistory].slice(0, 6));
  };

  const rotateSelectedShape = () => {
    const input = window.prompt('Ángulo de rotación en grados:', '15');
    if (input === null) {
      return;
    }

    const angle = Number(input);
    if (Number.isNaN(angle)) {
      setHistory((currentHistory) => ['Ángulo inválido para rotación', ...currentHistory].slice(0, 6));
      return;
    }

    applyTransformToSelected({ angle }, `Figura rotada ${angle}°`);
  };

  const stretchSelectedShape = () => {
    const inputX = window.prompt('Factor de estiramiento X (1 = sin cambio):', '1.2');
    if (inputX === null) {
      return;
    }

    const inputY = window.prompt('Factor de estiramiento Y (1 = sin cambio):', '1.0');
    if (inputY === null) {
      return;
    }

    const scaleX = Number(inputX);
    const scaleY = Number(inputY);

    if (Number.isNaN(scaleX) || Number.isNaN(scaleY)) {
      setHistory((currentHistory) => ['Factores inválidos para estiramiento', ...currentHistory].slice(0, 6));
      return;
    }

    applyTransformToSelected({ scaleX, scaleY }, `Figura estirada X:${scaleX.toFixed(2)} Y:${scaleY.toFixed(2)}`);
  };

  const handleCoordinateInputChange = (key, value) => {
    setCoordinateCapture((current) => ({ ...current, [key]: value }));
  };

  const toCanvasCoordinates = (x, y) => {
    const valueX = Number(x);
    const valueY = Number(y);

    if (Number.isNaN(valueX) || Number.isNaN(valueY)) {
      return null;
    }

    return {
      x: valueX,
      y: valueY
    };
  };

  const createShapeFromCoordinates = () => {
    if (activeTool !== 'Línea' && activeTool !== 'Rectángulo') {
      setHistory((currentHistory) => ['Selecciona Línea o Rectángulo para dibujar por coordenadas', ...currentHistory].slice(0, 6));
      return;
    }

    const start = toCanvasCoordinates(coordinateCapture.x1, coordinateCapture.y1);
    const end = toCanvasCoordinates(coordinateCapture.x2, coordinateCapture.y2);

    if (!start || !end) {
      setHistory((currentHistory) => ['Coordenadas inválidas para crear la figura', ...currentHistory].slice(0, 6));
      return;
    }

    const shape = normalizeCoordinates({
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tool: activeTool,
      start,
      end,
      color,
      thickness
    });

    setShapes((currentShapes) => [...currentShapes, shape]);
    setHistory((currentHistory) => [`Figura creada por coordenadas en ${activeTool.toLowerCase()}`, ...currentHistory].slice(0, 6));
    setCoordinateCapture({ x1: '', y1: '', x2: '', y2: '' });
  };

  // Distancia de un punto a un segmento (para hit testing)
  const pointToSegmentDistance = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  };

  // Parse user input for scale: accepts numeric (units per px) or ratio like '1:50'
  const parseScaleInput = (value) => {
    if (value === null || value === undefined) {
      setScaleRaw('');
      setScaleNumeric(null);
      setScaleRatio(null);
      return;
    }

    const raw = String(value).trim();
    setScaleRaw(raw);

    // numeric
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && raw !== '' && /^[0-9.]+$/.test(raw)) {
      setScaleNumeric(asNumber);
      setScaleRatio(null);
      return;
    }

    // ratio like 1:50 or 1 / 50
    const m = raw.match(/^(\d+)\s*[:\/]\s*(\d+)$/);
    if (m) {
      const num = Number(m[1]);
      const den = Number(m[2]);
      setScaleNumeric(null);
      setScaleRatio({ num, den, display: `${num}:${den}` });
      return;
    }

    // fallback
    setScaleNumeric(null);
    setScaleRatio(null);
  };

  const hitTestShape = (shape, point, tolerance = 8) => {
    if (!shape) return false;

    if (shape.tool === 'Lápiz' || shape.tool === 'Borrador') {
      const pts = shape.points || [];
      for (let i = 0; i < pts.length - 1; i += 1) {
        if (pointToSegmentDistance(point, pts[i], pts[i + 1]) <= tolerance) return true;
      }
      return false;
    }

    if (shape.tool === 'Línea') {
      return pointToSegmentDistance(point, shape.start, shape.end) <= tolerance;
    }

    if (shape.tool === 'Rectángulo') {
      const left = Math.min(shape.start.x, shape.end.x) - tolerance;
      const top = Math.min(shape.start.y, shape.end.y) - tolerance;
      const right = Math.max(shape.start.x, shape.end.x) + tolerance;
      const bottom = Math.max(shape.start.y, shape.end.y) + tolerance;
      return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    }

    if (shape.tool === 'Círculo') {
      const radius = Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y);
      const dist = Math.hypot(point.x - shape.start.x, point.y - shape.start.y);
      return Math.abs(dist - radius) <= tolerance || dist <= radius + tolerance;
    }

    return false;
  };

  const drawSelectionOutline = (context, shape) => {
    if (!shape) return;
    const handles = getSelectionHandles(shape);
    context.save();
    context.strokeStyle = 'rgba(88,183,255,0.95)';
    context.lineWidth = 1.4;
    context.setLineDash([6, 6]);

    if (shape.tool === 'Línea') {
      const minX = Math.min(shape.start.x, shape.end.x);
      const minY = Math.min(shape.start.y, shape.end.y);
      const maxX = Math.max(shape.start.x, shape.end.x);
      const maxY = Math.max(shape.start.y, shape.end.y);
      context.strokeRect(minX - 8, minY - 8, (maxX - minX) + 16, (maxY - minY) + 16);
    } else if (shape.tool === 'Rectángulo') {
      const left = Math.min(shape.start.x, shape.end.x);
      const top = Math.min(shape.start.y, shape.end.y);
      const width = Math.abs(shape.end.x - shape.start.x);
      const height = Math.abs(shape.end.y - shape.start.y);
      context.strokeRect(left - 6, top - 6, width + 12, height + 12);
    } else if (shape.tool === 'Círculo') {
      const radius = Math.hypot(shape.end.x - shape.start.x, shape.end.y - shape.start.y);
      context.beginPath();
      context.arc(shape.start.x, shape.start.y, radius + 8, 0, Math.PI * 2);
      context.stroke();
    } else if (shape.tool === 'Lápiz' || shape.tool === 'Borrador') {
      const pts = shape.points || [];
      if (pts.length > 0) {
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        context.strokeRect(minX - 8, minY - 8, (maxX - minX) + 16, (maxY - minY) + 16);
      }
    }

    if (handles) {
      context.setLineDash([]);
      context.fillStyle = 'rgba(10, 15, 24, 0.96)';
      context.strokeStyle = 'rgba(88,183,255,0.95)';

      Object.values(handles.corners).forEach((handlePoint) => {
        context.beginPath();
        context.rect(handlePoint.x - selectionHandleSize, handlePoint.y - selectionHandleSize, selectionHandleSize * 2, selectionHandleSize * 2);
        context.fill();
        context.stroke();
      });

      context.beginPath();
      context.arc(handles.rotate.x, handles.rotate.y, selectionHandleSize + 1, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = 'rgba(88,183,255,0.95)';
      context.font = 'bold 14px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('↻', handles.rotate.x, handles.rotate.y + 0.5);
    }

    context.restore();
  };

  const computeDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasAreaRef.current;

    if (!canvas || !wrapper) {
      return;
    }

    // Leemos el tamaño de una caché actualizada por el ResizeObserver en vez
    // de llamar a getBoundingClientRect() aquí. getBoundingClientRect()
    // fuerza un recálculo de layout síncrono del navegador, y redrawCanvas()
    // se ejecuta muy seguido (cada trazo, cada frame al arrastrar una
    // selección), así que evitar ese reflow importa para que se sienta ágil.
    let rect = canvasSizeRef.current;
    if (!rect.width || !rect.height) {
      rect = wrapper.getBoundingClientRect();
      canvasSizeRef.current = { width: rect.width, height: rect.height };
    }
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, rect.width, rect.height);

    if (showCartesianView) {
      context.save();
      context.strokeStyle = 'rgba(88, 183, 255, 0.08)';
      context.lineWidth = 1;
      context.beginPath();

      for (let x = 0; x <= rect.width; x += gridSpacingPx) {
        context.moveTo(x, 0);
        context.lineTo(x, rect.height);
      }

      for (let y = 0; y <= rect.height; y += gridSpacingPx) {
        context.moveTo(0, y);
        context.lineTo(rect.width, y);
      }

      context.stroke();
      context.restore();
    }

    context.strokeStyle = color;
    context.lineWidth = thickness;

    shapes.forEach((shape) => drawShape(context, shape));

    if (previewShape) {
      drawShape(context, previewShape);
    }

    // Dibujar selección si hay figura seleccionada
    if (selectedShapeId) {
      const sel = shapes.find((s) => s.id === selectedShapeId);
      if (sel) drawSelectionOutline(context, sel);
    }

    // Dibujar vista previa de medición
    if (measurementPreview && measurementPreview.start && measurementPreview.end) {
      context.save();
      context.strokeStyle = 'rgba(255,255,255,0.95)';
      context.lineWidth = 1.6;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(measurementPreview.start.x, measurementPreview.start.y);
      context.lineTo(measurementPreview.end.x, measurementPreview.end.y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = 'white';
      const mid = { x: (measurementPreview.start.x + measurementPreview.end.x) / 2, y: (measurementPreview.start.y + measurementPreview.end.y) / 2 };
      const pixels = computeDistance(measurementPreview.start, measurementPreview.end);
      context.font = '12px sans-serif';
      if (scaleNumeric) {
        const units = scaleNumeric * pixels;
        context.fillText(`${pixels.toFixed(1)} px • ${units.toFixed(2)} ${drawingUnit}`, mid.x + 8, mid.y - 8);
      } else if (scaleRatio) {
        context.fillText(`${pixels.toFixed(1)} px • escala ${scaleRatio.display} (${drawingUnit}) — usar Escala`, mid.x + 8, mid.y - 8);
      } else {
        context.fillText(`${pixels.toFixed(1)} px`, mid.x + 8, mid.y - 8);
      }
      context.restore();
    }
  }, [color, drawShape, measurementPreview, previewShape, scaleRaw, scaleNumeric, scaleRatio, selectedShapeId, shapes, showCartesianView, thickness]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const wrapper = canvasAreaRef.current;

    if (!wrapper || typeof ResizeObserver === 'undefined') {
      redrawCanvas();
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        canvasSizeRef.current = { width, height };
      }
      redrawCanvas();
    });

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [redrawCanvas]);

  const finishDrawing = useCallback(() => {
    const draftShape = draftRef.current;

    if (!draftShape) {
      return;
    }

    const committedShape = cloneShape(draftShape);
    committedShape.id = committedShape.id || `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hasContent =
      committedShape.tool === 'Lápiz' || committedShape.tool === 'Borrador'
        ? committedShape.points && committedShape.points.length > 1
        : committedShape.start && committedShape.end && committedShape.start.x !== committedShape.end.x
          || committedShape.start?.y !== committedShape.end?.y;

    if (hasContent) {
      setShapes((currentShapes) => [...currentShapes, committedShape]);
      setHistory((currentHistory) => [`Trazo realizado con ${committedShape.tool.toLowerCase()}`, ...currentHistory].slice(0, 6));
    }

    draftRef.current = null;
    setPreviewShape(null);
    drawingRef.current = false;
  }, []);

  // Exporta el lienzo tal como se ve (fondo + cuadrícula si está visible +
  // todas las figuras) directamente desde el <canvas> real, sin volver a
  // dibujar nada aparte: su contenido ya es exactamente el píxel final.
  const handleExport = useCallback((format) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseName = toFileName(activeProject?.name || 'proyecto') || 'proyecto';

    const downloadBlob = (blob, fileName) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    };

    if (format === 'png') {
      canvas.toBlob((blob) => downloadBlob(blob, `${baseName}.png`), 'image/png');
      return;
    }

    if (format === 'jpg') {
      // calidad 0.92: buen equilibrio entre tamaño de archivo y nitidez
      // para un dibujo técnico con líneas finas.
      canvas.toBlob((blob) => downloadBlob(blob, `${baseName}.jpg`), 'image/jpeg', 0.92);
      return;
    }

    if (format === 'pdf') {
      const dataUrl = canvas.toDataURL('image/png');
      // Página del PDF del mismo tamaño en píxeles que el lienzo, para que
      // la imagen quede a tamaño completo sin recortes ni franjas en blanco.
      const doc = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      doc.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
      doc.save(`${baseName}.pdf`);
    }
  }, [activeProject]);

  const handlePointerDown = (event) => {
    const point = getCanvasPoint(event);
    setCoordinates({ x: Math.round(point.x), y: Math.round(point.y) });
    event.currentTarget.setPointerCapture?.(event.pointerId);

    // Selección: detectar figura y preparar arrastre
    if (activeTool === 'Selección') {
      if (selectedShape && selectedShapeHandles) {
        if (isPointNearHandle(point, selectedShapeHandles.rotate)) {
          transformRef.current = {
            mode: 'rotate',
            shapeId: selectedShape.id,
            original: cloneShape(selectedShape),
            center: getShapeCenter(selectedShape),
            startAngle: Math.atan2(point.y - getShapeCenter(selectedShape).y, point.x - getShapeCenter(selectedShape).x)
          };
          return;
        }

        for (const handleKey of ['nw', 'ne', 'se', 'sw']) {
          if (isPointNearHandle(point, selectedShapeHandles.corners[handleKey])) {
            const oppositeKey = oppositeCorner(handleKey);
            transformRef.current = {
              mode: 'stretch',
              shapeId: selectedShape.id,
              original: cloneShape(selectedShape),
              anchor: selectedShapeHandles.corners[oppositeKey],
              startHandle: selectedShapeHandles.corners[handleKey],
              handleKey
            };
            return;
          }
        }

        if (hitTestShape(selectedShape, point, 8)) {
          transformRef.current = {
            mode: 'move',
            shapeId: selectedShape.id,
            original: cloneShape(selectedShape),
            startPoint: point
          };
          return;
        }
      }

      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const shape = shapes[i];
        if (hitTestShape(shape, point, 8)) {
          setSelectedShapeId(shape.id || shape._id || `${i}`);
          return;
        }
      }
      setSelectedShapeId(null);
      return;
    }

    if (activeTool === 'Eliminar') {
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const shape = shapes[i];
        if (hitTestShape(shape, point, 8)) {
          setShapes((currentShapes) => currentShapes.filter((item) => item.id !== shape.id));
          setSelectedShapeId(null);
          setHistory((currentHistory) => ['Figura eliminada', ...currentHistory].slice(0, 6));
          return;
        }
      }

      setHistory((currentHistory) => ['No se encontró una figura para eliminar', ...currentHistory].slice(0, 6));
      return;
    }

    // Escala: primer y segundo punto para definir escala
    if (activeTool === 'Escala') {
      if (!scalePointRef.current) {
        scalePointRef.current = point;
        setMeasurementPreview({ start: point, end: point });
      } else {
            const p1 = scalePointRef.current;
            const p2 = point;
            const pixels = computeDistance(p1, p2);
            const input = window.prompt('Introduce la distancia real para estos puntos (en unidades, por ejemplo 1000):', '1000');
            const real = input ? Number(input) : null;
            if (real && pixels > 0) {
              const newScale = real / pixels; // unidades por pixel
              setScaleNumeric(newScale);
              setScaleRaw(String(newScale));
              setScaleRatio(null);
            }
        scalePointRef.current = null;
        setMeasurementPreview(null);
      }
      return;
    }

    // Medición: primer y segundo punto para medir
    if (activeTool === 'Medición') {
      if (!measurementPointRef.current) {
        measurementPointRef.current = point;
        setMeasurementPreview({ start: point, end: point });
      } else {
        const p1 = measurementPointRef.current;
        const p2 = point;
        const pixels = computeDistance(p1, p2);
        const units = (scaleNumeric || 0) * pixels;
        if (scaleNumeric) {
          setHistory((cur) => [`Medición: ${pixels.toFixed(1)} px = ${units.toFixed(2)} ${drawingUnit}`, ...cur].slice(0, 6));
        } else if (scaleRatio) {
          setHistory((cur) => [`Medición: ${pixels.toFixed(1)} px @ escala ${scaleRatio.display} (${drawingUnit}) (sin calibrar)`, ...cur].slice(0, 6));
        } else {
          setHistory((cur) => [`Medición: ${pixels.toFixed(1)} px (sin escala)`, ...cur].slice(0, 6));
        }
        measurementPointRef.current = null;
        setMeasurementPreview({ start: p1, end: p2 });
        // dejar preview visible unos segundos
        window.setTimeout(() => setMeasurementPreview(null), 3500);
      }
      return;
    }

    // Herramientas que no dibujan directamente sobre el lienzo
    if (!tools.includes(activeTool)) {
      return;
    }

    // Herramientas de dibujo estándar
    drawingRef.current = true;
    draftRef.current = {
      tool: activeTool,
      start: point,
      end: point,
      points: [point],
      color,
      thickness
    };
    setPreviewShape(buildPreviewShape(activeTool, point, point, color, thickness));
  };

  // Pinta solo el segmento nuevo directamente sobre el lienzo, sin borrar ni
  // redibujar nada más. Esto es lo que hace que el trazo a mano libre se
  // sienta fluido: el costo de cada punto es constante (una línea corta) sin
  // importar cuántas figuras ya existan o cuán largo sea el trazo actual.
  const paintFreehandSegment = useCallback((from, to, shape) => {
    const canvas = canvasRef.current;
    if (!canvas || !from) return;

    const context = canvas.getContext('2d');
    context.save();

    if (shape.tool === 'Borrador') {
      context.strokeStyle = backgroundColor;
      context.lineWidth = (shape.thickness || thickness) * 3.6;
    } else {
      context.strokeStyle = shape.color || color;
      context.lineWidth = shape.thickness || thickness;
    }

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  }, [color, thickness]);

  // Todo lo que necesita un redibujado completo (arrastrar/rotar/estirar una
  // selección, la vista previa de escala o medición, o la vista previa de
  // línea/rectángulo/círculo) se procesa como máximo una vez por frame en
  // lugar de una vez por cada evento de puntero. El navegador puede disparar
  // más eventos "pointermove" de los que puede pintar, así que hacer un
  // redibujado completo por cada uno de ellos era la causa principal de la
  // sensación de traqueteo.
  const processPointerMove = useCallback((point) => {
    if (!point) return;

    setCoordinates({ x: Math.round(point.x), y: Math.round(point.y) });

    if (transformRef.current && activeTool === 'Selección') {
      const interaction = transformRef.current;
      const { original, shapeId, mode } = interaction;

      setShapes((currentShapes) => currentShapes.map((shape) => {
        if (shape.id !== shapeId) {
          return shape;
        }

        if (mode === 'move') {
          const dx = point.x - interaction.startPoint.x;
          const dy = point.y - interaction.startPoint.y;
          return normalizeCoordinates(translateShape(original, dx, dy));
        }

        if (mode === 'rotate') {
          const center = interaction.center;
          const currentAngle = Math.atan2(point.y - center.y, point.x - center.x);
          const deltaAngle = ((currentAngle - interaction.startAngle) * 180) / Math.PI;
          return normalizeCoordinates(transformShapeAroundOrigin(original, { origin: center, angle: deltaAngle }));
        }

        if (mode === 'stretch') {
          const anchor = interaction.anchor;
          const startHandle = interaction.startHandle;
          const denominatorX = startHandle.x - anchor.x || 1;
          const denominatorY = startHandle.y - anchor.y || 1;
          const deltaX = point.x - startHandle.x;
          const deltaY = point.y - startHandle.y;
          const sensitivity = 0.25;
          const snapStep = 0.05;
          const rawScaleX = 1 + (deltaX / Math.abs(denominatorX || 1)) * sensitivity;
          const rawScaleY = 1 + (deltaY / Math.abs(denominatorY || 1)) * sensitivity;
          const scaleX = Math.max(0.2, Math.min(4, Math.round(rawScaleX / snapStep) * snapStep));
          const scaleY = Math.max(0.2, Math.min(4, Math.round(rawScaleY / snapStep) * snapStep));
          return normalizeCoordinates(transformShapeAroundOrigin(original, { origin: anchor, scaleX, scaleY }));
        }

        return shape;
      }));

      // No llamamos a redrawCanvas() aquí: setShapes ya dispara un
      // re-render y el efecto que sigue a redrawCanvas se encarga de
      // pintar una sola vez. Llamarlo también aquí era lo que provocaba
      // un redibujado doble por cada evento.
      return;
    }

    // Actualizar preview de escala/medición mientras se mueve
    if ((activeTool === 'Escala' && scalePointRef.current) || (activeTool === 'Medición' && measurementPointRef.current)) {
      const refPoint = activeTool === 'Escala' ? scalePointRef.current : measurementPointRef.current;
      setMeasurementPreview({ start: refPoint, end: point });
      return;
    }

    if (!drawingRef.current) return;

    const draftShape = draftRef.current;
    if (!draftShape) return;

    // El trazo a mano libre (Lápiz/Borrador) ya se pintó de forma directa
    // e inmediata en handlePointerMove; aquí no hay nada más que hacer.
    if (draftShape.tool === 'Lápiz' || draftShape.tool === 'Borrador') {
      return;
    }

    draftShape.end = point;
    setPreviewShape(buildPreviewShape(draftShape.tool, draftShape.start, point, color, thickness));
  }, [activeTool, color, normalizeCoordinates, thickness, transformShapeAroundOrigin, translateShape]);

  const handlePointerMove = (event) => {
    const point = getCanvasPoint(event);

    // Ruta rápida: trazo a mano libre. Se pinta el segmento nuevo de
    // inmediato, sin pasar por el estado de React ni por un redibujado
    // completo, así que el costo por evento es constante.
    if (drawingRef.current && draftRef.current && (draftRef.current.tool === 'Lápiz' || draftRef.current.tool === 'Borrador')) {
      const draftShape = draftRef.current;
      const lastPoint = draftShape.points[draftShape.points.length - 1];
      draftShape.points.push(point);
      paintFreehandSegment(lastPoint, point, draftShape);
    }

    // Todo lo demás (incluida la lectura de coordenadas en la barra
    // inferior) se agrupa como máximo una vez por frame de animación.
    latestPointRef.current = point;
    if (!moveFrameRef.current) {
      moveFrameRef.current = requestAnimationFrame(() => {
        moveFrameRef.current = null;
        processPointerMove(latestPointRef.current);
      });
    }
  };

  useEffect(() => () => {
    if (moveFrameRef.current) {
      cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
  }, []);

  const handlePointerUp = () => {
    // Soltar arrastre de selección
    if (activeTool === 'Selección' && transformRef.current) {
      const interaction = transformRef.current;
      transformRef.current = null;

      if (interaction.mode === 'move') {
        setHistory((cur) => ['Objeto movido', ...cur].slice(0, 6));
      } else if (interaction.mode === 'stretch') {
        setHistory((cur) => ['Objeto estirado', ...cur].slice(0, 6));
      } else if (interaction.mode === 'rotate') {
        setHistory((cur) => ['Objeto rotado', ...cur].slice(0, 6));
      }

      return;
    }

    // Si estaba definiendo escala o medición, no finalizar dibujo
    if (activeTool === 'Escala') return;
    if (activeTool === 'Medición') return;

    if (!drawingRef.current) {
      return;
    }

    finishDrawing();
  };

  const clearCanvas = () => {
    setShapes([]);
    setPreviewShape(null);
    draftRef.current = null;
    redrawCanvas();
    setHistory((currentHistory) => ['Lienzo limpiado', ...currentHistory].slice(0, 6));
  };

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    setPreviewShape(null);
    draftRef.current = null;
    drawingRef.current = false;
    setHistory((currentHistory) => [`Herramienta activa: ${tool}`, ...currentHistory].slice(0, 6));
  };

  return (
    <Box className={styles.workspaceShell}>
      {draftInfo?.projectId === activeProject?.id && (
        <Alert
          severity="warning"
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={recoverDraft}>Recuperar</Button>
              <Button color="inherit" size="small" onClick={discardDraft}>Descartar</Button>
            </Stack>
          }
          sx={{ mb: 2 }}
        >
          Hay un respaldo local sin guardar de este proyecto.
        </Alert>
      )}
      <Box className={styles.topBar}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
          Área principal de dibujo
        </Typography>
        <Box className={styles.menuRow}>
          {['Archivo', 'Editar', 'Ver', 'Proyecto', 'Configuración', 'Ayuda'].map((item) => (
            <Button
              key={item}
              className={styles.menuItem}
              variant="text"
              onClick={(event) => {
                if (item === 'Archivo') {
                  setFileMenuAnchor(event.currentTarget);
                  return;
                }

                if (item === 'Ver') {
                  setShowCartesianView((currentValue) => !currentValue);
                }

                if (item === 'Proyecto') {
                  navigate('/proyectos/abrir');
                }

                if (item === 'Configuración') {
                  navigate('/configuracion');
                }
              }}
            >
              {item}
            </Button>
          ))}

          <Menu anchorEl={fileMenuAnchor} open={Boolean(fileMenuAnchor)} onClose={() => setFileMenuAnchor(null)}>
            <MenuItem onClick={() => { handleExport('png'); setFileMenuAnchor(null); }}>Exportar como PNG</MenuItem>
            <MenuItem onClick={() => { handleExport('jpg'); setFileMenuAnchor(null); }}>Exportar como JPG</MenuItem>
            <MenuItem onClick={() => { handleExport('pdf'); setFileMenuAnchor(null); }}>Exportar como PDF</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box className={styles.leftPanel}>
        <Typography className={styles.sectionTitle}>Herramientas</Typography>
        {toolGroups.map((group) => (
          <Box key={group.label} className={styles.toolGroup}>
            <Typography className={styles.toolGroupLabel}>{group.label}</Typography>
            <Stack className={styles.toolStack}>
              {group.tools.map((tool) => (
                <Button
                  key={tool}
                  variant="outlined"
                  className={`${styles.toolButton} ${activeTool === tool ? styles.toolButtonActive : ''}`}
                  onClick={() => handleToolClick(tool)}
                >
                  {tool}
                </Button>
              ))}
            </Stack>
          </Box>
        ))}

        <Box className={styles.toolGroup}>
          <Typography className={styles.toolGroupLabel}>Vista</Typography>
          <Stack className={styles.toolStack}>
            <Button
              variant="outlined"
              className={`${styles.toolButton} ${showCartesianView ? styles.toolButtonActive : ''}`}
              onClick={() => setShowCartesianView((currentValue) => !currentValue)}
            >
              Cuadrícula {showCartesianView ? '(visible)' : '(oculta)'}
            </Button>
          </Stack>
        </Box>
      </Box>

      <Box className={styles.canvasPanel}>
        <Box ref={canvasAreaRef} className={styles.canvasWrap}>
          <Box className={`${styles.gridOverlay} ${showCartesianView ? '' : styles.gridOverlayHidden}`} />
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <Box className={styles.canvasHint}>
            Dibuja con el mouse usando datos simulados. Más adelante este flujo será sustituido por la entrada de la
            Raspberry Pi.
          </Box>
        </Box>
      </Box>

      <Box className={styles.rightPanel}>
        <Typography className={styles.sectionTitle}>Propiedades</Typography>
        <Stack spacing={2}>
          <Box className={styles.propertyList}>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Escala</span>
              <TextField fullWidth size="small" value={scaleRaw} onChange={(event) => parseScaleInput(event.target.value)} />
              {scaleNumeric ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>1 px = {scaleNumeric.toFixed(4)} {drawingUnit}</Typography>
              ) : scaleRatio ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Escala {scaleRatio.display} — unidad {drawingUnit} (usa "Escala" para calibrar)</Typography>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Introduce un número (u/px) o una escala tipo 1:50</Typography>
              )}
            </Box>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Color</span>
              <TextField fullWidth size="small" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </Box>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Grosor</span>
              <TextField
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 1, max: 20 }}
                value={thickness}
                onChange={(event) => setThickness(Number(event.target.value))}
              />
            </Box>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Vista cartesiana</span>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {showCartesianView ? 'La rejilla está visible' : 'La rejilla está oculta'}
              </Typography>
              <Button variant="outlined" size="small" onClick={() => setShowCartesianView((currentValue) => !currentValue)}>
                {showCartesianView ? 'Ocultar rejilla' : 'Mostrar rejilla'}
              </Button>
            </Box>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Dibujo por coordenadas</span>
              <Stack spacing={1} className={styles.coordinateForm}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Usa coordenadas absolutas del lienzo para crear una línea o rectángulo.
                </Typography>
                <Box className={styles.coordinateRow}>
                  <TextField label="X1" size="small" type="number" value={coordinateCapture.x1} onChange={(event) => handleCoordinateInputChange('x1', event.target.value)} />
                  <TextField label="Y1" size="small" type="number" value={coordinateCapture.y1} onChange={(event) => handleCoordinateInputChange('y1', event.target.value)} />
                </Box>
                <Box className={styles.coordinateRow}>
                  <TextField label="X2" size="small" type="number" value={coordinateCapture.x2} onChange={(event) => handleCoordinateInputChange('x2', event.target.value)} />
                  <TextField label="Y2" size="small" type="number" value={coordinateCapture.y2} onChange={(event) => handleCoordinateInputChange('y2', event.target.value)} />
                </Box>
                <Typography className={styles.coordinateHint}>
                  Herramienta activa: {activeTool}. Disponible para Línea y Rectángulo.
                </Typography>
                <Button variant="contained" size="small" onClick={createShapeFromCoordinates}>
                  Dibujar por coordenadas
                </Button>
              </Stack>
            </Box>
            <Box className={styles.propertyCard}>
              <span className={styles.propertyLabel}>Coordenadas de selección</span>
              {selectedShape ? (
                <Stack spacing={0.5}>
                  <Typography variant="body2">Figura: {selectedShape.tool}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Inicio: {selectedShape.start ? `${Math.round(selectedShape.start.x)}, ${Math.round(selectedShape.start.y)}` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Fin: {selectedShape.end ? `${Math.round(selectedShape.end.x)}, ${Math.round(selectedShape.end.y)}` : 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Arrastra las esquinas para estirar y el símbolo ↻ para rotar.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ pt: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={stretchSelectedShape}>
                      Estirar
                    </Button>
                    <Button size="small" variant="outlined" onClick={rotateSelectedShape}>
                      Rotar
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={deleteSelectedShape}>
                      Eliminar
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Selecciona una figura para ver sus coordenadas.
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

          <Box>
            <Typography className={styles.sectionTitle}>Historial</Typography>
            <Stack className={styles.historyList}>
              {history.map((entry, index) => (
                <Box key={`${entry}-${index}`} className={styles.historyCard}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {entry}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography className={styles.sectionTitle}>Capas</Typography>
            <Stack className={styles.layerList}>
              {layers.map((layer) => (
                <Box key={layer} className={styles.layerCard}>
                  <Typography variant="body2">{layer}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Button variant="outlined" onClick={clearCanvas}>
            Limpiar canvas
          </Button>
          <Button variant="contained" onClick={() => saveProject()}>
            Guardar proyecto
          </Button>
        </Stack>
      </Box>

      <Box className={styles.bottomBar}>
        <Box className={styles.statusBlock}>
          <span className={styles.statusLabel}>Coordenadas X,Y</span>
          <span className={styles.statusValue}>{coordinates.x}, {coordinates.y}</span>
        </Box>
        <Box className={styles.statusBlock}>
          <span className={styles.statusLabel}>Nivel de Zoom</span>
          <span className={styles.statusValue}>{zoom}%</span>
        </Box>
        <Box className={styles.statusBlock}>
          <span className={styles.statusLabel}>Estado del sistema</span>
          <span className={styles.statusValue}>Simulación activa</span>
        </Box>
        <Box className={styles.statusBlock}>
          <span className={styles.statusLabel}>Nombre del proyecto</span>
          <span className={styles.statusValue}>{activeProject?.name || 'Proyecto de tesis - etapa interfaz'}</span>
        </Box>
        <Box className={styles.statusBlock}>
          <span className={styles.statusLabel}>Hora</span>
          <span className={styles.statusValue}><Clock /></span>
        </Box>
      </Box>
    </Box>
  );
}
// Reloj aislado en su propio componente: su timer de 1s solo re-renderiza
// este <span>, no la página completa de 1300+ líneas (canvas, barra de
// herramientas, panel de propiedades, historial, etc.).
const Clock = memo(function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});
