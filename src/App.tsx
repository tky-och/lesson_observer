import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Session, MaterialTab, AppSettings, SessionMetadata } from './types';
import { DEFAULT_SETTINGS } from './types';
import { useStorage } from './hooks/useStorage';
import { useAutoSave } from './hooks/useAutoSave';
import { useDrawing } from './hooks/useDrawing';
import { Header, type SaveStatus } from './components/Header/Header';
import { TabBar } from './components/TabBar/TabBar';
import { TextEditor } from './components/ObservationNote/TextEditor';
import { MetadataEditor } from './components/ObservationNote/MetadataEditor';
import { DrawingCanvas } from './components/Handwriting/DrawingCanvas';
import { DrawingToolbar } from './components/Handwriting/DrawingToolbar';
import { AnnotationLayerView } from './components/MaterialView/AnnotationLayer';
import { SessionList } from './components/SessionList/SessionList';
import { Settings } from './components/Settings/Settings';
import { ExportPanel } from './components/Export/ExportPanel';
import { HelpModal } from './components/Help/HelpModal';
import { FeedbackModal } from './components/Feedback/FeedbackModal';

const App: React.FC = () => {
  const storage = useStorage();
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>('observation');
  const [secondaryTab, setSecondaryTab] = useState<string | null>(null);
  const [hasFSHandle, setHasFSHandle] = useState(false);
  const [fsErrorNotice, setFsErrorNotice] = useState<string | null>(null);

  // 写真は session.photos に保持する。読みやすさのために定数で参照する。
  const photos = session?.photos ?? [];

  // Modal states
  const [showSessionList, setShowSessionList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showMetaEdit, setShowMetaEdit] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initialLoadRef = useRef(true);

  // Drawing for the observation tab freehand area
  const drawing = useDrawing(settings.defaultPenColor, settings.defaultPenSize);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-save: when auto-save completes, reset the save status indicator
  useAutoSave(
    session,
    useCallback(() => {
      setSaveStatus((prev) => {
        if (prev === 'saving') return prev; // manual save in flight — don't override
        return 'idle';
      });
    }, [])
  );

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
      // Mark initial load complete on next tick so the session-change effect
      // doesn't flag the initial population as "dirty".
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track unsaved changes whenever session mutates after initial load
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (!session) return;
    setSaveStatus((prev) => (prev === 'saving' ? prev : 'dirty'));
  }, [session]);

  // Flush pending FS saves when the tab is hidden or about to unload. Auto-save
  // only handles IndexedDB; without this, changes within the last 2 s before
  // closing the tab never reach the user's selected folder.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        storage.flushAllPendingFS().catch(() => {});
      }
    };
    const onPageHide = () => {
      storage.flushAllPendingFS().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
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

  const handleClassEndTimeChange = useCallback((t: number | null) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            metadata: { ...prev.metadata, classEndTime: t },
            updatedAt: Date.now(),
          }
        : null
    );
  }, []);

  const handleUpdateMetadata = useCallback((updated: SessionMetadata) => {
    setSession((prev) =>
      prev ? { ...prev, metadata: updated, updatedAt: Date.now() } : null
    );
  }, []);

  const handleSaveNow = useCallback(async () => {
    if (!session) return;
    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = undefined;
    }
    setSaveStatus('saving');
    setFsErrorNotice(null);
    try {
      // 手動保存では FS まで完全に書ききる（debounce を待たない）。
      const result = await storage.saveSessionDetailed(session, { flushFs: true });

      if (result.fsStatus === 'saved' || result.fsStatus === 'unsupported') {
        setSaveStatus('saved');
      } else if (
        result.fsStatus === 'no-folder' ||
        result.fsStatus === 'permission-required'
      ) {
        // IDB には書けたがフォルダ側に届いていない。状態は saved にしつつ、
        // 別途 UI バナーで「フォルダ未設定/権限切れ」を伝える。
        setSaveStatus('saved');
        setFsErrorNotice(
          result.fsStatus === 'no-folder'
            ? '保存先フォルダが未設定です。「📂 セッション」から再度フォルダを選択してください。'
            : '保存先フォルダの権限が切れています。「📂 セッション」を開いてフォルダを選び直してください。'
        );
      } else {
        // 'error'
        setSaveStatus('error');
        setFsErrorNotice(
          'フォルダへの書き込みに失敗しました。フォルダを再選択するか、エクスポートでバックアップを取ってください。'
        );
      }

      savedResetTimerRef.current = setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 1500);
    } catch (e) {
      // IDB write 失敗はここに来る。実害が大きいので明示する。
      console.error('[save] manual save failed:', e);
      setSaveStatus('error');
      setFsErrorNotice('保存に失敗しました。ブラウザを再読み込みする前にエクスポートを試してください。');
      savedResetTimerRef.current = setTimeout(() => {
        setSaveStatus('dirty');
      }, 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleImportSession = useCallback(
    async (imported: Session) => {
      await storage.saveSession(imported);
      setSession(imported);
      drawing.setStrokes(imported.freehandStrokes || []);
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
    setSecondaryTab((prev) => (prev === id ? null : prev));
  }, []);

  const handleOpenInSecondary = useCallback((tabId: string) => {
    setSecondaryTab((prev) => (prev === tabId ? null : tabId));
  }, []);

  const handleCloseSecondary = useCallback(() => setSecondaryTab(null), []);

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
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        photos: [...(prev.photos ?? []), dataUrl],
        textNotes: prev.textNotes + `\n[写真添付]\n`,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setSession((prev) => {
      if (!prev) return null;
      const next = (prev.photos ?? []).filter((_, i) => i !== index);
      return { ...prev, photos: next, updatedAt: Date.now() };
    });
  }, []);

  const renderTabContent = (tabId: string) => {
    if (!session) return null;
    if (tabId === 'observation') {
      return (
        <div className="h-full overflow-auto">
          <TextEditor
            value={session.textNotes}
            onChange={handleTextChange}
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={handleRemovePhoto}
            quickPhrases={settings.quickPhrases}
            metadata={session.metadata}
            onClassStartTimeChange={handleClassStartTimeChange}
            onClassEndTimeChange={handleClassEndTimeChange}
            onOpenMetadataEdit={() => setShowMetaEdit(true)}
          />
        </div>
      );
    }
    if (tabId === 'handwriting') {
      return (
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
              currentStrokeRef={drawing.currentStrokeRef}
              isDrawingMode={drawing.isDrawingMode}
              onStartStroke={drawing.startStroke}
              onAddPoint={drawing.addPoint}
              onEndStroke={drawing.endStroke}
              canvasRef={tabId === activeTab ? canvasRef : undefined}
            />
          </div>
        </div>
      );
    }
    const mat = session.materials.find((m) => m.id === tabId);
    if (mat) {
      return (
        <AnnotationLayerView
          material={mat}
          onUpdate={handleUpdateMaterial}
          defaultPenColor={settings.defaultPenColor}
          defaultPenSize={settings.defaultPenSize}
        />
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        タブを選択してください
      </div>
    );
  };

  const tabLabel = (tabId: string): string => {
    if (tabId === 'observation') return '📝 観察メモ';
    if (tabId === 'handwriting') return '✍️ 手書き';
    const mat = session?.materials.find((m) => m.id === tabId);
    if (mat) return `${mat.type === 'pdf' ? '📄' : '🖼️'} ${mat.name}`;
    return '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        metadata={session?.metadata ?? null}
        sessionCreatedAt={session?.createdAt ?? null}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => session && setShowExport(true)}
        onOpenSessionList={() => setShowSessionList(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenFeedback={() => setShowFeedback(true)}
        onSaveNow={handleSaveNow}
        saveStatus={saveStatus}
        isFileSystemSupported={storage.isFileSystemSupported}
        hasFSHandle={hasFSHandle}
      />

      {fsErrorNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-start gap-2">
          <span className="font-medium">⚠️</span>
          <span className="flex-1">{fsErrorNotice}</span>
          <button
            onClick={() => setFsErrorNotice(null)}
            className="text-amber-600 hover:text-amber-900"
            aria-label="通知を閉じる"
          >
            ✕
          </button>
        </div>
      )}

      {session ? (
        <>
          <TabBar
            activeTab={activeTab}
            secondaryTab={secondaryTab}
            materials={session.materials}
            onTabChange={setActiveTab}
            onOpenInSecondary={handleOpenInSecondary}
            onCloseSecondary={handleCloseSecondary}
            onAddMaterial={handleAddMaterial}
            onRenameMaterial={handleRenameMaterial}
            onDeleteMaterial={handleDeleteMaterial}
          />

          <div className="flex-1 overflow-hidden flex">
            <div className={secondaryTab ? 'w-1/2 h-full overflow-hidden border-r border-gray-300' : 'w-full h-full overflow-hidden'}>
              {secondaryTab && (
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 border-b border-gray-200">
                  左: {tabLabel(activeTab)}
                </div>
              )}
              <div className={secondaryTab ? 'h-[calc(100%-25px)]' : 'h-full'}>
                {renderTabContent(activeTab)}
              </div>
            </div>
            {secondaryTab && (
              <div className="w-1/2 h-full overflow-hidden">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                  <span>右: {tabLabel(secondaryTab)}</span>
                  <button
                    onClick={handleCloseSecondary}
                    className="text-gray-400 hover:text-red-600"
                    title="右ペインを閉じる"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-[calc(100%-25px)]">
                  {renderTabContent(secondaryTab)}
                </div>
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
          onClose={async () => {
            setShowSessionList(false);
            // SessionList 内でフォルダを選び直した可能性があるので再評価
            const handle = await storage.getDirectoryHandle();
            setHasFSHandle(!!handle);
            if (handle) setFsErrorNotice(null);
          }}
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
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showMetaEdit && session && (
        <MetadataEditor
          metadata={session.metadata}
          onSave={handleUpdateMetadata}
          onClose={() => setShowMetaEdit(false)}
        />
      )}
    </div>
  );
};

export default App;
