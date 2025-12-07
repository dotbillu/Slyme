"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import { keysAtom } from "@/lib/store"; 
import KeyGen from "@/lib/crypt"; 
import {
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function Welcome() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [activeStep, setActiveStep] = useState(0);
  const [username, setUsername] = useState("");
  const [, setKeys] = useAtom(keysAtom);
  const [localKeys, setLocalKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    try {
      const generated = KeyGen();
      setLocalKeys(generated);
      setKeys(generated);
      setError("");
      setActiveStep(1);
    } catch (err) {
      setError("Failed to generate encryption keys.",err);
    }
  };

  // Step 2: Download Private Key
  const handleDownload = () => {
    if (!localKeys || !username) return;

    const element = document.createElement("a");
    const file = new Blob([localKeys.privateKey], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `@${username}.slyme.key`; 
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
    if (localKeys) {
      navigator.clipboard.writeText(localKeys.privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinalize = async () => {
    if (!localKeys || !username) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          publicKey: localKeys.publicKey, 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to register user");
      }

      await update({ isNewUser: false });

      router.replace("/home");

  } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black p-4">
      <Stack spacing={4} sx={{ maxWidth: 500, width: "100%" }}>
        
        {/* Header */}
        <div className="text-center">
          <Typography variant="h4" color="white" fontWeight="bold">
            Welcome, {session?.user?.name?.split(" ")[0]}
          </Typography>
          <Typography color="gray" mt={1}>
            Let&apos;s set up your secure identity.
          </Typography>
        </div>

        {/* Stepper Visual */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ 
            '& .MuiStepLabel-label': { color: 'gray' },
            '& .MuiStepLabel-label.Mui-active': { color: 'white' },
            '& .MuiStepLabel-label.Mui-completed': { color: '#4caf50' },
        }}>
          <Step><StepLabel>Choose Username</StepLabel></Step>
          <Step><StepLabel>Secure Keys</StepLabel></Step>
        </Stepper>

        {/* Step 1: Username Input */}
        {activeStep === 0 && (
          <form onSubmit={handleGenerateKeys}>
            <Stack spacing={3}>
              <TextField
                label="Choose a Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                fullWidth
                required
                autoFocus
                error={!!error}
                helperText={error}
                sx={{
                  input: { color: "white" },
                  label: { color: "gray" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "gray" },
                    "&:hover fieldset": { borderColor: "white" },
                    "&.Mui-focused fieldset": { borderColor: "white" },
                  },
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                sx={{ bgcolor: "white", color: "black", '&:hover': { bgcolor: '#e0e0e0'} }}
              >
                Generate Secure Keys
              </Button>
            </Stack>
          </form>
        )}

        {/* Step 2: Key Management */}
        {activeStep === 1 && localKeys && (
          <Stack spacing={3}>
            <Alert severity="warning" sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)', color: '#ff9800' }}>
              <strong>Do not lose this key!</strong> We cannot recover it for you.
              Save it immediately.
            </Alert>

            <Paper sx={{ p: 2, bgcolor: "#111", border: "1px solid #333" }}>
              <Typography variant="subtitle2" color="gray" mb={1}>
                Your Private Key
              </Typography>
              <TextField
                value={localKeys.privateKey}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopy} color={copied ? "success" : "default"}>
                         {copied ? <CheckCircleIcon /> : <ContentCopyIcon sx={{ color: 'white'}} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  textarea: { color: "white", fontFamily: "monospace", fontSize: "0.8rem" },
                  "& .MuiOutlinedInput-root fieldset": { border: "none" },
                }}
              />
            </Paper>
            
            <Stack direction="row" spacing={2}>
              <Button
                onClick={handleDownload}
                variant="outlined"
                startIcon={<DownloadIcon />}
                fullWidth
                sx={{ borderColor: "gray", color: "white", '&:hover': { borderColor: "white"} }}
              >
                Download Key
              </Button>
            </Stack>

            <Button 
              onClick={handleFinalize} 
              variant="contained" 
              size="large"
              disabled={loading}
              sx={{ bgcolor: "white", color: "black", '&:hover': { bgcolor: '#e0e0e0'} }}
            >
              {loading ? "Creating Account..." : "I've Saved It, Start Journey"}
            </Button>
            
            {error && <Typography color="error" textAlign="center">{error}</Typography>}
          </Stack>
        )}

      </Stack>
    </div>
  );
}
