import { NotebookPen } from "lucide-react";

export default function DiaryPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center text-muted-foreground">
        <NotebookPen className="h-10 w-10 text-secondary" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Личный дневник</h2>
          <p className="text-sm">Здесь появится ваш личный дневник для заметок и осознанности.</p>
        </div>
      </div>
    </div>
  );
}
