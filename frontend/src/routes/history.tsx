import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Calendar, 
  Clock, 
  Layers, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";

// 🔥 Aapke project ki original firebase file se auth aur db ko import kiya hai
import { auth, db } from "@/lib/firebase"; 
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Component States
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ============================================================
  // 🔒 FETCH SECURE USER SPECIFIC HISTORY
  // ============================================================
  useEffect(() => {
    if (!user) {
      toast.error("Please login to view your history logs.");
      navigate({ to: "/login" });
      return;
    }

    const fetchUserHistory = async () => {
      setLoading(true);
      try {
        const historyRef = collection(db, "asl_history");
        
        // Target explicit secure user match parameters linked to indexed layout order
        const q = query(
          historyRef,
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);
        const logs: any[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp * 1000 || Date.now());
          
          const dayName = rawDate.toLocaleDateString('en-US', { weekday: 'long' }); 
          const pureDate = rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
          const pureTime = rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 

          logs.push({
            id: docSnap.id,
            gesture: data.gesture || data.label || "Unknown",
            confidence: data.confidence || 0.0,
            day: dayName,
            date: pureDate,
            time: pureTime,
            rawTimestamp: rawDate
          });
        });

        setHistoryItems(logs);
      } catch (error) {
        console.error("Error fetching secure logs:", error);
        toast.error("Failed to load your history dataset.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserHistory();
  }, [user, db, navigate]);

  // ============================================================
  // 🗑️ DELETE SINGLE LOG ENTRY FROM DATABASE
  // ============================================================
  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "asl_history", itemId));
      setHistoryItems(prev => prev.filter(item => item.id !== itemId));
      toast.success("Prediction log deleted permanently");
    } catch (error) {
      toast.error("Could not remove log entry");
    }
  };

  // State Memoized Global Search Functionality
  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => 
      item.gesture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.day.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [historyItems, searchQuery]);

  // ============================================================
  // 📄 VITE-SAFE PROFESSIONAL PDF GENERATOR (Dynamic Runtime Export)
  // ============================================================
  const downloadPDFReport = async () => {
    if (filteredHistory.length === 0) {
      toast.error("No records available to export");
      return;
    }

    try {
      // Inline execution protects the engine runtime from package analysis failure bugs
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Premium Report Typography Layout Design
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59); 
      doc.text("ASL REAL-TIME TRANSLATOR", 14, 22);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); 
      doc.text("Automated Sign Recognition & Identity Analytics System", 14, 28);
      
      // Verification Metadata Table Section Block
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`Account Profile: ${user?.displayName || "Active Core User"}`, 14, 38);
      doc.text(`Registered ID: ${user?.email || "N/A"}`, 14, 43);
      doc.text(`Generated Timeline: ${new Date().toLocaleString()}`, 14, 48);
      
      // Dynamic rows map flow routing values
      const tableHeaders = [["Index", "Detected Sign", "Confidence Match", "Day", "Calendar Date", "Timestamp"]];
      const tableRows = filteredHistory.map((item, index) => [
        index + 1,
        `Sign [${item.gesture}]`,
        `${Math.round(item.confidence * 100)}% Match`,
        item.day,
        item.date,
        item.time
      ]);

      autoTable(doc, {
        startY: 55,
        head: tableHeaders,
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" }, 
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3.5 },
        columnStyles: {
          1: { fontStyle: "bold" },
          2: { textColor: [16, 185, 129] } 
        }
      });

      const filename = `${(user?.displayName || "User").replace(/\s+/g, "_")}_ASL_History.pdf`;
      doc.save(filename);
      toast.success("PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF execution crash:", err);
      toast.error("Failed to compile layout into PDF.");
    }
  };

  return (
    <AppShell>
      <PageHeader 
        title="Translation History" 
        description="Review, search, and manage your personalized real-time sign detection logs."
        action={
          <Button 
            onClick={downloadPDFReport} 
            className="gradient-primary text-white shadow-lg font-medium transition-all hover:opacity-95"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF Report
          </Button>
        }
      />

      {/* Top Core Info Analytics Dashboard Panel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4 flex items-center gap-4 border border-glass-border">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Layers className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Signs Saved</p>
            <h4 className="text-xl font-bold">{historyItems.length} records</h4>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 flex items-center gap-4 border border-glass-border">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Session Status</p>
            <h4 className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Sync Active
            </h4>
          </div>
        </GlassCard>
      </div>

      {/* Advanced Text Filter Search Input */}
      <div className="relative mb-4 w-full max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by sign letter, day, or date..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass pl-9 border-glass-border text-sm"
        />
      </div>

      {/* Main Dynamic Logs List Container */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Scanning secure logs dataset... Just a second...
          </div>
        ) : filteredHistory.length === 0 ? (
          <GlassCard className="p-8 text-center border border-dashed border-glass-border">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No secure logs found.</p>
          </GlassCard>
        ) : (
          filteredHistory.map((item) => (
            <GlassCard 
              key={item.id} 
              className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-glass-border hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Sign Label Display */}
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center font-black text-xl text-white shadow-glow">
                  {item.gesture}
                </div>
                
                {/* Calendar Parameters Blocks */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-foreground font-bold">{item.day}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Logged at {item.time}</span>
                  </div>
                </div>
              </div>

              {/* Confidence Badge & Action Elements */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Confidence</p>
                  <p className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/10 inline-block mt-0.5">
                    {Math.round(item.confidence * 100)}% Match
                  </p>
                </div>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl w-9 h-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </AppShell>
  );
}