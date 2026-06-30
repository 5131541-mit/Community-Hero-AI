import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, MapPin, Sparkles, Mic, MicOff, AlertCircle, 
  Trash2, Send, Loader2, ArrowRight, CheckCircle2 
} from "lucide-react";
import { IssueCategory, IssueSeverity, Issue } from "../types";
import { addOfflineReport, getOfflineReports, deleteOfflineReport } from "../lib/offlineDb";

interface CivicFormProps {
  pinnedLocation: { lat: number; lng: number } | null;
  pinnedAddress: string;
  isPinningMode: boolean;
  setPinningMode: (active: boolean) => void;
  onSubmitSuccess: (newIssue: Issue) => void;
  issues: Issue[];
}

const CATEGORIES: IssueCategory[] = ["Road", "Waste", "Electricity", "Water", "Safety", "Traffic", "Other"];
const SEVERITIES: IssueSeverity[] = ["Low", "Medium", "High", "Critical"];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export default function CivicForm({
  pinnedLocation,
  pinnedAddress,
  isPinningMode,
  setPinningMode,
  onSubmitSuccess,
  issues
}: CivicFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory>("Road");
  const [specificType, setSpecificType] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("Medium");
  const [department, setDepartment] = useState("Road Department");
  const [priorityScore, setPriorityScore] = useState(50);
  const [severityAnalysis, setSeverityAnalysis] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [damageEstimation, setDamageEstimation] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Voice Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state & refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const startCamera = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering file input click
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setFormError(null);
      // Wait for next render cycle to bind video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setFormError("Could not access camera. Please check your system permissions.");
    }
  };

  const capturePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      const maxWidth = 800;

      // Downscale to a max width of 800px while maintaining the aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Compress as JPEG with 0.75 quality to reduce footprint
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setImageUrl(dataUrl);
        setAiSuccessMessage("Photo captured, resized to 800px max width, and compressed successfully!");
      }
      stopCamera();
    } catch (err: any) {
      console.error("Capture photo failed:", err);
      setFormError("Failed to capture photo from video stream.");
    }
  };

  const stopCamera = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Offline mode queue and sync
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  const updateOfflineQueueCount = async () => {
    try {
      const reports = await getOfflineReports();
      setOfflineQueueCount(reports.length);
    } catch (e) {
      setOfflineQueueCount(0);
    }
  };

  const triggerBackgroundSync = async () => {
    try {
      const queue = await getOfflineReports();
      if (queue.length === 0) return;

      console.log(`IndexedDB Background Sync Manager: Found ${queue.length} reports in offline queue. Auto-submitting...`);
      setAiSuccessMessage(`Network restored! Auto-submitting ${queue.length} cached offline reports from IndexedDB...`);

      let successCount = 0;
      for (const report of queue) {
        try {
          // Remove ID assigned by IndexedDB before sending to backend
          const { id, createdAtLocal, ...pureReport } = report;
          const res = await fetch("/api/issues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pureReport)
          });
          if (res.ok) {
            const newIssue = await res.json();
            onSubmitSuccess(newIssue);
            // Delete from IndexedDB upon successful upload
            if (id !== undefined) {
              await deleteOfflineReport(id);
              successCount++;
            }
          }
        } catch (err) {
          console.error("Failed to sync IndexedDB offline report:", err);
        }
      }

      await updateOfflineQueueCount();
      
      if (successCount === queue.length) {
        setAiSuccessMessage("Awesome! All IndexedDB offline reports successfully synced and submitted online!");
      } else if (successCount > 0) {
        setAiSuccessMessage(`Sync partial: ${successCount} reports uploaded from local database.`);
      }
    } catch (e) {
      console.error("Error processing IndexedDB offline queue sync:", e);
    }
  };

  useEffect(() => {
    updateOfflineQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerBackgroundSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      triggerBackgroundSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Find potential duplicate active complaints nearby
  const findDuplicate = () => {
    if (!pinnedLocation || !issues || issues.length === 0) return null;
    for (const issue of issues) {
      if (issue.status === "Resolved") continue;
      if (issue.category.toLowerCase() === category.toLowerCase()) {
        const dist = getDistance(pinnedLocation.lat, pinnedLocation.lng, issue.latitude, issue.longitude);
        if (dist < 300) { // 300 meters threshold
          return { issue, distance: Math.round(dist) };
        }
      }
    }
    return null;
  };

  const duplicateInfo = findDuplicate();

  // Voice transcript post-processing using Gemini voice-process endpoint
  const processVoiceTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    setAiLoading(true);
    setFormError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/gemini/voice-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceText: transcript })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.category && CATEGORIES.includes(data.category)) {
          setCategory(data.category as IssueCategory);
        }
        if (data.specificType) setSpecificType(data.specificType);
        if (data.polishedDescription) {
          setDescription(data.polishedDescription);
        } else {
          setDescription(transcript);
        }
        setAiSuccessMessage("Voice reporting processed! Gemini auto-filled the category, specific type, and formatted the description.");
      } else {
        setDescription((prev) => prev ? `${prev} ${transcript}`.trim() : transcript);
      }
    } catch (err: any) {
      console.error("Error processing voice with Gemini:", err);
      setDescription((prev) => prev ? `${prev} ${transcript}`.trim() : transcript);
    } finally {
      setAiLoading(false);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setIsRecording(false);
        processVoiceTranscript(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  // Update coordinates when pinned location changes
  const latStr = pinnedLocation ? pinnedLocation.lat.toFixed(6) : "Not Set";
  const lngStr = pinnedLocation ? pinnedLocation.lng.toFixed(6) : "Not Set";

  const handleToggleRecord = () => {
    if (!recognition) {
      // Fallback if Speech API is not supported in iframe/browser
      const simulatedText = prompt("Type what you would like to dictate (Simulating speech input):", "");
      if (simulatedText) {
        setVoiceText(simulatedText);
        processVoiceTranscript(simulatedText);
      }
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  const compressAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const maxWidth = 800; // Downscale large images to a max width of 800px while maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG with 0.75 quality to greatly reduce payload size
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
              resolve(compressedBase64);
            } else {
              resolve(event.target?.result as string);
            }
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Convert uploaded image to base64 with compression & resizing
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAiSuccessMessage("Resizing and compressing image to minimize payload size...");
      const compressedDataUrl = await compressAndResizeImage(file);
      setImageUrl(compressedDataUrl);
      setFormError(null);
      setAiSuccessMessage("Photo successfully uploaded and compressed!");
    } catch (err: any) {
      console.error("Compression failed:", err);
      // Fallback to uncompressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setFormError(null);
        setAiSuccessMessage("Photo attached (uncompressed fallback).");
      };
      reader.readAsDataURL(file);
    }
  };

  // Use Gemini Vision to auto-detect category, title, description, severity, department, priority
  const handleAiAutoDetect = async () => {
    if (!imageUrl && !description && !voiceText) {
      setFormError("Please upload an image, write a brief description, or use voice recording so the AI can analyze it.");
      return;
    }

    setAiLoading(true);
    setFormError(null);
    setAiSuccessMessage(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUrl || undefined,
          description: description || undefined,
          voiceText: voiceText || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to reach Gemini analysis server.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Populate form with Gemini AI outputs
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category && CATEGORIES.includes(data.category)) {
        setCategory(data.category as IssueCategory);
      }
      if (data.specificType) setSpecificType(data.specificType);
      if (data.severity && SEVERITIES.includes(data.severity)) {
        setSeverity(data.severity as IssueSeverity);
      }
      if (data.department) setDepartment(data.department);
      if (data.priorityScore) setPriorityScore(Number(data.priorityScore));
      if (data.severityAnalysis) setSeverityAnalysis(data.severityAnalysis);
      if (data.damageEstimation) setDamageEstimation(data.damageEstimation);

      setAiSuccessMessage("Gemini Vision AI successfully analyzed your report, appraised structural damage, categorized it, and pre-filled the form!");
    } catch (err: any) {
      console.error("AI Auto-detection failed:", err);
      setFormError(`AI Analysis failed: ${err.message || "Please configure your GEMINI_API_KEY."}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pinnedLocation) {
      setFormError("Please choose a location on the map using the 'Pin on Map' tool.");
      return;
    }

    if (!title.trim()) {
      setFormError("Please enter a title or use AI Auto-Detect to generate one.");
      return;
    }

    setSubmitLoading(true);

    const reportData = {
      title,
      description,
      category,
      specificType: specificType || category,
      severity,
      latitude: pinnedLocation.lat,
      longitude: pinnedLocation.lng,
      address: pinnedAddress || `${pinnedLocation.lat.toFixed(5)}, ${pinnedLocation.lng.toFixed(5)}`,
      imageUrl,
      reporterEmail: reporterEmail || "anonymous@community.org",
      reporterName: reporterName || "Anonymous Resident",
      department,
      priorityScore,
      damageEstimation: damageEstimation || undefined
    };

    if (!navigator.onLine) {
      // CONNECTION IS OFFLINE: Save to IndexedDB queue and notify success offline
      try {
        await addOfflineReport(reportData);

        // Reset form
        setTitle("");
        setDescription("");
        setSpecificType("");
        setSeverity("Medium");
        setCategory("Road");
        setImageUrl("");
        setSeverityAnalysis("");
        setVoiceText("");
        setDamageEstimation("");
        setPinningMode(false);

        await updateOfflineQueueCount();
        setAiSuccessMessage("You are currently offline. Report successfully cached in your IndexedDB offline sync queue! It will auto-submit when connection is restored.");
      } catch (err: any) {
        setFormError("Failed to save report to client IndexedDB database.");
      } finally {
        setSubmitLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });

      if (!res.ok) {
        throw new Error("Failed to submit issue to server.");
      }

      const newIssue = await res.json();
      
      // Reset form
      setTitle("");
      setDescription("");
      setSpecificType("");
      setSeverity("Medium");
      setCategory("Road");
      setImageUrl("");
      setSeverityAnalysis("");
      setVoiceText("");
      setDamageEstimation("");
      setPinningMode(false);

      // Notify parent
      onSubmitSuccess(newIssue);

    } catch (err: any) {
      console.warn("Network dispatch failed. Caching report to local IndexedDB queue:", err);
      try {
        await addOfflineReport(reportData);

        // Reset form
        setTitle("");
        setDescription("");
        setSpecificType("");
        setSeverity("Medium");
        setCategory("Road");
        setImageUrl("");
        setSeverityAnalysis("");
        setVoiceText("");
        setDamageEstimation("");
        setPinningMode(false);

        await updateOfflineQueueCount();
        setAiSuccessMessage("Server is unreachable. Report successfully saved to your IndexedDB offline sync database and will auto-submit later!");
      } catch (e) {
        setFormError(`Failed to submit issue: ${err.message}`);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-base text-slate-900 tracking-tight">Report Local Problem</h3>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Offline Mode
              </span>
            )}
            {offlineQueueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full font-medium animate-pulse">
                {offlineQueueCount} Cached Reports
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">File a new issue with AI-driven categorization</p>
        </div>
        <button
          type="button"
          onClick={() => setPinningMode(!isPinningMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
            isPinningMode
              ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <MapPin className={`w-3.5 h-3.5 ${isPinningMode ? "animate-pulse" : ""}`} />
          {isPinningMode ? "Pinning Active" : "Choose on Map"}
        </button>
      </div>

      {/* Pinned Coordinates Display */}
      {pinnedLocation ? (
        <div className="bg-teal-50/50 border border-teal-100 p-2.5 rounded-xl flex items-start gap-2.5 text-xs animate-fade-in">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-700">Geotag Captured</p>
            <p className="text-slate-600 font-mono text-[10px] mt-0.5">
              Lat: {latStr} • Lng: {lngStr}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1 italic">{pinnedAddress}</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-700">No Location Pin Selected</p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              Click &quot;Choose on Map&quot; to pick the exact coordinate of the issue.
            </p>
          </div>
        </div>
      )}

      {/* Main Image upload & Voice Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Photo Upload Card */}
        <div 
          onClick={() => {
            if (!isCameraOpen) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-[130px] overflow-hidden group relative ${isCameraOpen ? "p-0 border-none bg-black" : ""}`}
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          {isCameraOpen ? (
            <div className="absolute inset-0 bg-black flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-10">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3 py-1 rounded-xl shadow cursor-pointer"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={(e) => stopCamera(e)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-3 py-1 rounded-xl shadow cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt="Uploaded issue" 
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageUrl("");
                }}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded-lg transition-colors shadow cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-150 group-hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4 text-slate-500 group-hover:text-teal-600" />
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[9px] px-2 py-1 rounded-lg shadow-sm cursor-pointer border border-slate-700"
                >
                  Live Webcam
                </button>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">Attach Incident Photo</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click card or launch Live Webcam</p>
              </div>
            </>
          )}
        </div>

        {/* Voice Dictation Card (Voice-to-Report) */}
        <div 
          onClick={handleToggleRecord}
          className={`border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-[130px] relative ${
            isRecording 
              ? "bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20" 
              : "bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-300"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${
            isRecording 
              ? "bg-rose-500 border-rose-600 text-white animate-pulse" 
              : "bg-white border-slate-150 text-slate-500"
          }`}>
            {isRecording ? <Mic className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5 text-slate-500" />}
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-700">
              {isRecording ? "Listening..." : "Voice-to-Report (Mic)"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[150px] truncate">
              {voiceText || "Speak & Gemini fills categories"}
            </p>
          </div>
        </div>
      </div>

      {/* Gemini AI Auto-Detect Callout */}
      <button
        type="button"
        disabled={aiLoading}
        onClick={handleAiAutoDetect}
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
      >
        {aiLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            <span>Gemini Vision AI is analyzing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto-Detect & Fill with Gemini Vision</span>
          </>
        )}
      </button>

      {/* AI Success Message */}
      {aiSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI Pre-fill Completed</p>
            <p className="opacity-90">{aiSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* Form Error */}
      {formError && (
        <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl flex items-start gap-2 text-[11px] text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Duplicate Alert */}
      {duplicateInfo && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-slate-800 animate-fade-in my-2">
          <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-amber-800">Potential Duplicate Detected Nearby</p>
            <p className="text-slate-600">
              Another active <span className="font-semibold text-amber-700">{category}</span> issue, <span className="italic font-semibold">"{duplicateInfo.issue.title}"</span>, exists only <span className="font-semibold">{duplicateInfo.distance}m</span> away.
            </p>
            <p className="text-[10px] text-slate-500">
              To reduce duplicate work for municipal teams, consider searching for this report on the map and upvoting it!
            </p>
          </div>
        </div>
      )}

      {/* Submittable Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Reporter details */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Name</label>
            <input
              type="text"
              required
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Samuel Stone"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Email</label>
            <input
              type="email"
              required
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="e.g. sam@stone.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Issue Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Pothole obstructing bike lane"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Detailed Description</label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details of the problem so city officials can investigate..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specific Problem</label>
            <input
              type="text"
              value={specificType}
              onChange={(e) => setSpecificType(e.target.value)}
              placeholder="e.g. Road Crack"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition-all cursor-pointer"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Auto-routed Department"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {severityAnalysis && (
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">AI Priority Explanation:</span> {severityAnalysis} (Calculated Priority: {priorityScore}/100)
          </div>
        )}

        {damageEstimation && (
          <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-150 text-[10px] text-teal-800 animate-fade-in space-y-0.5">
            <p className="font-bold text-teal-900">✨ Gemini Vision Damage Appraisal</p>
            <p className="text-slate-700 italic">{damageEstimation}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitLoading || !pinnedLocation}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {submitLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>File Official Complaint</span>
        </button>
      </form>
    </div>
  );
}
