import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Session, MaterialTab, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { useStorage } from './hooks/useStorage';
import { useAutoSave } from './hooks/useAutoSave';
import { useDrawing } from './hooks/useDrawing';
import { Header } from './components/Header/Header';
import { TabBar } from './components/TabBar/TabBar';
import { TextEditor } from './components/ObservationNote/TextEditor';
import { DrawingCanvas } from './components/Handwriting/DrawingCanvas';
import { DrawingToolbar } from './components/Handwriting/DrawingToolbar';
import { AnnotationLayerView } from './components/MaterialView/AnnotationLayer';
import { SessionList } from './components/SessionList/SessionList';
import { Settings } from './components/Settings/Settings';
import { ExportPanel } from './components/Export/ExportPanel';

const App: React.FC = () => {
  const storage = useStorage();
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>('observation');
  const [photos, setPhotos] = useState<string[]>([]);
  const [hasFSHandle, setHasFSHandle] = useState(false);

  // Modal states
  const [showSessionList, setShowSessionList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Drawing for the observation tab freehand area
  const drawing = useDrawing(settings.defaultPenColor, settings.defaultPenSize);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-save
  useAutoSave(session);

  // Load settings on mount, show session list if no session
  useEffect(() => {
    (async () => {
      const s = await storage.loadSettings();
      setSettings(s);
      const sessions = await storage.loadSessions();
      if (sessions.length > 0) {
        setSession(sessions[0]);
        drawing.setStrokes(sessions[0].freehandStrokes || []);
      } else {
        setShowSessionList(true);
      }
      const handle = await storage.getDirectoryHandle();
      setHasFSHandle(!!handle);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync drawing strokes back to session
  useEffect(() => {
    if (session && drawing.strokes !== session.freehandStrokes) {
      setSession((prev) =>
        prev ? { ...prev, freehandStrokes: drawing.strokes, updatedAt: Date.now() } : null
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing.strokes]);

  const handleTextChange = useCallback((text: string) => {
    setSession((prev) =>
      prev ? { ...prev, textNotes: text, updatedAt: Date.now() } : null
    );
  }, []);

  const handleClassStartTimeChange = useCallback((t: number | null) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            metadata: { ...prev.metadata, classStartTime: t },
            updatedAt: Date.now(),
          }
        : null
    );
  }, []);

  const handleImportSession = useCallback(
    async (imported: Session) => {
      await storage.saveSession(imported);
      setSession(imported);
      drawing.setStrokes(imported.freehandStrokes || []);
      setPhotos([]);
      setActiveTab('observation');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleAddMaterial = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const isPdf = file.type === 'application/pdf';
    const mat: MaterialTab = {
      id: uuidv4(),
      name: file.name.replace(/\.[^.]+$/, ''),
      type: isPdf ? 'pdf' : 'image',
      data: buffer,
      currentPage: 1,
      annotations: {},
    };
    setSession((prev) =>
      prev ? { ...prev, materials: [...prev.materials, mat], updatedAt: Date.now() } : null
    );
    setActiveTab(mat.id);
  }, []);

  const handleRenameMaterial = useCallback((id: string, name: string) => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        materials: prev.materials.map((m) => (m.id === id ? { ...m, name } : m)),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleDeleteMaterial = useCallback((id: string) => {
    setSession((prev) => {
      if (!prev) return null;
      const filtered = prev.materials.filter((m) => m.id !== id);
      return { ...prev, materials: filtered, updatedAt: Date.now() };
    });
    setActiveTab('observation');
  }, []);

  const handleUpdateMaterial = useCallback((updated: MaterialTab) => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        materials: prev.materials.map((m) => (m.id === updated.id ? updated : m)),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleSelectSession = useCallback((s: Session) => {
    setSession(s);
    drawing.setStrokes(s.freehandStrokes || []);
    setActiveTab('observation');
    setShowSessionList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewSession = useCallback((s: Session) => {
    setSession(s);
    drawing.clearAll();
    setPhotos([]);
    setActiveTab('observation');
    setShowSessionList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPhoto = useCallback((dataUrl: string) => {
    setPhotos((prev) => [...prev, dataUrl]);
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        textNotes: prev.textNotes + `\n[写真添付]\n`,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const activeMaterial = session?.materials.find((m) => m.id === activeTab);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        metadata={session?.metadata ?? null}
        sessionCreatedAt={session?.createdAt ?? null}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => session && setShowExport(true)}
        onOpenSessionList={() => setShowSessionList(true)}
        isFileSystemSupported={storage.isFileSystemSupported}
        hasFSHandle={hasFSHandle}
      />

      {session ? (
        <>
          <TabBar
            activeTab={activeTab}
            materials={session.materials}
            onTabChange={setActiveTab}
            onAddMaterial={handleAddMaterial}
            onRenameMaterial={handleRenameMaterial}
            onDeleteMaterial={handleDeleteMaterial}
          />

          <div className="flex-1 overflow-hidden">
            {activeTab === 'observation' ? (
              <div className="h-full overflow-auto">
                <TextEditor
                  value={session.textNotes}
                  onChange={handleTextChange}
                  photos={photos}
                  onAddPhoto={handleAddPhoto}
                  onRemovePhoto={handleRemovePhoto}
                  quickPhrases={settings.quickPhrases}
                  classStartTime={session.metadata.classStartTime}
                  onClassStartTimeChange={handleClassStartTimeChange}
                />
              </div>
            ) : activeTab === 'handwriting' ? (
              <div className="flex flex-col h-full">
                <DrawingToolbar
                  penColor={drawing.penColor}
                  penSize={drawing.penSize}
                  isErasing={drawing.isErasing}
                  isDrawingMode={drawing.isDrawingMode}
                  canUndo={drawing.strokes.length > 0}
                  canRedo={drawing.undoneStrokes.length > 0}
                  onColorChange={drawing.setPenColor}
                  onSizeChange={drawing.setPenSize}
                  onToggleEraser={() => drawing.setIsErasing(!drawing.isErasing)}
                  onToggleDrawingMode={() => drawing.setIsDrawingMode(!drawing.isDrawingMode)}
                  onUndo={drawing.undo}
                  onRedo={drawing.redo}
                  onClear={() => {
                    if (window.confirm('手書きメモをすべて消去しますか？')) {
                      drawing.clearAll();
                    }
                  }}
                />
                <div
                  className="flex-1 overflow-hidden"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <DrawingCanvas
                    strokes={drawing.strokes}
                    currentStroke={drawing.currentStroke}
                    isDrawingMode={drawing.isDrawingMode}
                    onStartStroke={drawing.startStroke}
                    onAddPoint={drawing.addPoint}
                    onEndStroke={drawing.endStroke}
                    canvasRef={canvasRef}
                  />
                </div>
              </div>
            ) : activeMaterial ? (
              <AnnotationLayerView
                material={activeMaterial}
                onUpdate={handleUpdateMaterial}
                defaultPenColor={settings.defaultPenColor}
                defaultPenSize={settings.defaultPenSize}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                タブを選択してください
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <div className="text-lg">セッションを選択または作成してください</div>
            <button
              onClick={() => setShowSessionList(true)}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              セッション管理を開く
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showSessionList && (
        <SessionList
          currentSessionId={session?.sessionId ?? null}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onClose={() => setShowSessionList(false)}
          settings={settings}
        />
      )}
      {showSettings && (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showExport && session && (
        <ExportPanel
          session={session}
          onClose={() => setShowExport(false)}
          onImport={handleImportSession}
        />
      )}
    </div>
  );
};

export default App;
