"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import { keysAtom, userAtom } from "@store";
import { toast } from "sonner";
import {
  Key,
  Upload,
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import KeyGen from "@/lib/crypt";
import axios from "axios";

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

type Step = 1 | 2 | 3;

export default function WelcomeBack() {
  const router = useRouter();
  const [, setKeys] = useAtom(keysAtom);
  const [user] = useAtom(userAtom);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<"RESTORE" | "RESET" | null>(null);

  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newGeneratedKeys, setNewGeneratedKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrivateKeyInput(e.target.value);
    if (error) setError(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPrivateKeyInput(content.trim());
      setError(null);
      toast.success("Key file loaded");
    };
    reader.readAsText(file);
  };

  const verifyAndRestore = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const trimmedKey = privateKeyInput.trim();

      if (!trimmedKey) {
        setError("Please enter a key");
        return;
      }

      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(trimmedKey) || trimmedKey.length % 4 !== 0) {
        setError("Invalid Key Format");
        toast.error("Invalid Key Format");
        return;
      }

      let derivedPublicKey = "";
      try {
        const secretKeyUint8 = naclUtil.decodeBase64(trimmedKey);
        if (secretKeyUint8.length !== nacl.box.secretKeyLength) {
          setError("Invalid Key Length");
          toast.error("Invalid Key Length");
          return;
        }
        const keyPair = nacl.box.keyPair.fromSecretKey(secretKeyUint8);
        derivedPublicKey = naclUtil.encodeBase64(keyPair.publicKey);
      } catch (e) {
        setError("Invalid Key Format");
        toast.error(`Invalid key format(${e})`);
        return;
      }

      try {
        const res = await axios.post("/api/auth/verify-key", {
          publicKey: derivedPublicKey,
        });

        if (res.data.success) {
          setKeys({
            privateKey: trimmedKey,
            publicKey: derivedPublicKey,
          });
          toast.success("Identity verified");
          router.replace("/");
        }
      } catch (axiosErr: unknown) {
        console.warn("Verification failed:", axiosErr);
        if (axios.isAxiosError(axiosErr) && axiosErr.response?.status === 403) {
          setError("Key doesn't match");
          toast.error("Key doesn't match your account");
        } else {
          setError("Verification Error");
          toast.error("Something went wrong");
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const generateNewIdentity = async () => {
    setIsVerifying(true);
    try {
      const keys = KeyGen();
      await axios.post("/api/auth/update-key", {
        publicKey: keys.publicKey,
      });

      setNewGeneratedKeys(keys);
      setStep(3);
      toast.success("New Identity Generated");
    } catch (e) {
      toast.error(`key generation failed(${e})`);
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadKeyFile = () => {
    if (!newGeneratedKeys || !user?.username) return;
    const element = document.createElement("a");
    const file = new Blob([newGeneratedKeys.privateKey], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = `${user.username}_private_key.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Key downloaded");
  };

  const finishReset = () => {
    if (newGeneratedKeys) {
      setKeys(newGeneratedKeys);
      router.replace("/");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-white p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] bg-size-[20px_20px] opacity-20 pointer-events-none" />

      <div className="z-10 w-full max-w-2xl flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight"
          >
            Welcome back,{" "}
            <span className="text-blue-500">
              {user?.username || "Traveler"}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-lg"
          >
            "Security is not a product, but a process."
          </motion.p>
        </div>

        <div className="flex items-center gap-4 w-full max-w-xs mb-8">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
          >
            1
          </div>
          <div className="h-0.5 flex-1 bg-zinc-800 relative">
            <motion.div
              className="absolute inset-0 bg-blue-600"
              initial={{ width: "0%" }}
              animate={{
                width: step >= 2 ? (step === 3 ? "100%" : "50%") : "0%",
              }}
            />
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
          >
            2
          </div>
        </div>

        <div className="w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <button
                  onClick={() => {
                    setMode("RESTORE");
                    setStep(2);
                    setError(null);
                  }}
                  className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-blue-950/20 hover:border-blue-800 transition-all flex flex-col items-center gap-4 text-center cursor-pointer"
                >
                  <div className="p-4 rounded-full bg-zinc-800/50 group-hover:bg-blue-500/20 transition-colors">
                    <Key className="w-8 h-8 text-zinc-400 group-hover:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-200 group-hover:text-blue-400">
                      I have my Key
                    </h3>
                    <p className="text-sm text-zinc-500 mt-2">
                      Paste or upload your private key file to decrypt your
                      session.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMode("RESET");
                    setStep(2);
                    setError(null);
                  }}
                  className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-red-950/20 hover:border-red-800 transition-all flex flex-col items-center gap-4 text-center cursor-pointer"
                >
                  <div className="p-4 rounded-full bg-zinc-800/50 group-hover:bg-red-500/20 transition-colors">
                    <RefreshCw className="w-8 h-8 text-zinc-400 group-hover:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-200 group-hover:text-red-400">
                      I lost my Key
                    </h3>
                    <p className="text-sm text-zinc-500 mt-2">
                      Generate a new identity. Warning: previous messages will
                      be lost.
                    </p>
                  </div>
                </button>
              </motion.div>
            )}

            {step === 2 && mode === "RESTORE" && (
              <motion.div
                key="step2-restore"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="relative group">
                  <textarea
                    value={privateKeyInput}
                    onChange={handleInputChange}
                    placeholder="Paste your private key here..."
                    className={`w-full h-48 bg-zinc-900 rounded-xl p-4 font-mono text-sm focus:outline-none transition-all resize-none border 
                      ${
                        error
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-100 placeholder:text-red-900/50"
                          : "border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                      }`}
                  />

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -bottom-6 left-0 text-red-500 text-xs font-medium flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute bottom-4 right-4">
                    <input
                      type="file"
                      accept=".txt"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Import .txt
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={verifyAndRestore}
                    disabled={!privateKeyInput || isVerifying}
                    className="flex-1 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors py-3 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying ? (
                      <span className="loading loading-dots loading-sm"></span>
                    ) : (
                      "Unlock Account"
                    )}
                    {!isVerifying && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && mode === "RESET" && (
              <motion.div
                key="step2-reset"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6 max-w-lg mx-auto"
              >
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-red-400">Security Warning</h3>
                    <p className="text-sm text-red-200/60 mt-2 leading-relaxed">
                      You are about to reset your cryptographic identity. Since
                      we do not store your private keys,
                      <strong>
                        all previous encrypted messages will be permanently
                        unreadable
                      </strong>
                      . This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Wait, go back
                  </button>
                  <button
                    onClick={generateNewIdentity}
                    disabled={isVerifying}
                    className="flex-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors py-3 cursor-pointer"
                  >
                    {isVerifying
                      ? "Generating..."
                      : "I Understand, Create New Key"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && newGeneratedKeys && (
              <motion.div
                key="step3"
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
                    <h2 className="text-xl font-bold text-white">
                      New Identity Created
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      Please save your new Private Key immediately.
                    </p>
                  </div>
                </div>

                <div className="relative group text-left">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-zinc-800 to-zinc-800 rounded-xl opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
                  <div className="relative flex items-center bg-black border border-zinc-800 rounded-xl p-1.5 pl-4">
                    <code className="flex-1 font-mono text-xs text-zinc-400 truncate mr-2 select-all cursor-text">
                      {newGeneratedKeys.privateKey}
                    </code>

                    <div className="flex items-center gap-1 border-l border-zinc-800 pl-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            newGeneratedKeys.privateKey,
                          );
                          toast.success("Copied to clipboard");
                        }}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={downloadKeyFile}
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
                    onClick={finishReset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors font-bold text-sm cursor-pointer"
                  >
                    Continue
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
