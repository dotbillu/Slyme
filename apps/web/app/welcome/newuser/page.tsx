"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import { keysAtom } from "@/lib/store"; 
import KeyGen from "@/lib/crypt"; 
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { 
  CheckCircle2, 
  Copy, 
  Download, 
  ArrowRight, 
  ShieldCheck,
  Loader2
} from "lucide-react";

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

export default function Welcome() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [, setKeys] = useAtom(keysAtom);
  const [localKeys, setLocalKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    try {
      const generated = KeyGen();
      setLocalKeys(generated);
      setKeys(generated);
      setStep(2);
      toast.success("Keys generated successfully");
    } catch (err) {
      toast.error(`Failed to generate encryption keys (${err})`);
    }
  };

  const handleDownload = () => {
    if (!localKeys || !username) return;

    const element = document.createElement("a");
    const file = new Blob([localKeys.privateKey], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `@${username}.slyme.key`; 
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    toast.success("Key file downloaded");
  };

  const handleCopy = () => {
    if (localKeys) {
      navigator.clipboard.writeText(localKeys.privateKey);
      toast.success("Private key copied");
    }
  };

  const handleFinalize = async () => {
    if (!localKeys || !username) return;

    setLoading(true);

    try {
      await axios.post("/api/auth/register", {
        username: username,
        publicKey: localKeys.publicKey, 
      });

      await update({ isNewUser: false });
      router.replace("/home");

    } catch (err: unknown) {
      console.error(err);
      
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || err.response?.data?.message || "Failed to register user";
        toast.error(message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("An unexpected error occurred");
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-white p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] bg-size:[20px_20px] opacity-20 pointer-events-none" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-8">
        
        <div className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight"
          >
            Welcome, <span className="text-blue-500">{session?.user?.name?.split(" ")[0] || "Traveler"}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-lg"
          >
            Let&apos;s set up your secure identity.
          </motion.p>
        </div>

        <div className="flex items-center gap-4 w-full max-w-xs mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>1</div>
          <div className="h-0.5 flex-1 bg-zinc-800 relative">
            <motion.div 
              className="absolute inset-0 bg-blue-600" 
              initial={{ width: "0%" }}
              animate={{ width: step === 2 ? "100%" : "0%" }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>2</div>
        </div>

        <div className="w-full">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.form 
                key="step1" 
                variants={slideUp} 
                initial="hidden" 
                animate="visible" 
                exit="exit"
                onSubmit={handleGenerateKeys}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 ml-1">Choose a unique username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="username"
                      className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition-all cursor-text"
                      autoFocus
                    />
                    <ShieldCheck className="absolute right-3 top-3 w-5 h-5 text-zinc-600 pointer-events-none" />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-white text-black font-bold rounded-xl py-3 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Generate Secure Keys
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            )}

            {step === 2 && localKeys && (
              <motion.div 
                key="step2" 
                variants={slideUp} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="space-y-8 text-center"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center ring-1 ring-green-500/20">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">New Identity Created</h2>
                    <p className="text-zinc-500 text-sm mt-1">Please save your new Private Key immediately.</p>
                  </div>
                </div>

                <div className="relative group text-left">
                   <div className="absolute -inset-0.5 bg-linear-to-r from-zinc-800 to-zinc-800 rounded-xl opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
                   <div className="relative flex items-center bg-black border border-zinc-800 rounded-xl p-1.5 pl-4">
                      <code className="flex-1 font-mono text-xs text-zinc-400 truncate mr-2 select-all cursor-text">
                        {localKeys.privateKey}
                      </code>
                      
                      <div className="flex items-center gap-1 border-l border-zinc-800 pl-1">
                        <button 
                          onClick={handleCopy}
                          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy Key"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleDownload}
                          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Download Key"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleFinalize}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
