import { useState } from "react";
import { Lock, Unlock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputWithContext } from "@/components/ui/input-with-context";
import { toastWithSound as toast } from "@/lib/toast-with-sound";
import { Spinner } from "@/components/ui/spinner";

interface LockScreenProps {
  isSetup: boolean;
  onUnlock: () => void;
}

export function LockScreen({ isSetup, onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (isSetup && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast.success(isSetup ? "Security enabled! Welcome." : "Unlocked successfully");
        onUnlock();
        window.location.reload();
      } else {
        toast.error(isSetup ? "Failed to set password" : "Incorrect password");
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8 p-8 border rounded-xl bg-card/50 shadow-xl backdrop-blur-sm">
        
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            {isSetup ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
          </div>
          <h1 className="text-3xl font-bold">
            {isSetup ? "Welcome to SpotiFLAC" : "App Locked"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSetup 
              ? "This server is unprotected. Please set a master password to secure your web interface." 
              : "Please enter your master password to access the server."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-8">
          <div className="space-y-3">
            <InputWithContext
              type="password"
              placeholder={isSetup ? "Create a master password..." : "Enter password..."}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center text-lg py-6"
              autoFocus
              minLength={8}
            />
            
            {isSetup && (
              <InputWithContext
                type="password"
                placeholder="Confirm your password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-center text-lg py-6"
                minLength={8}
              />
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full py-6 text-lg font-medium mt-4" 
            disabled={loading || !password || (isSetup && !confirmPassword)}
          >
            {loading ? (
              <Spinner className="h-5 w-5 mr-2" />
            ) : isSetup ? (
              <ShieldCheck className="h-5 w-5 mr-2" />
            ) : (
              <Unlock className="h-5 w-5 mr-2" />
            )}
            {isSetup ? "Secure Server & Login" : "Unlock Application"}
          </Button>
        </form>
      </div>
    </div>
  );
}
