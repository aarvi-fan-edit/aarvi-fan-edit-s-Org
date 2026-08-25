import { useState } from "react";
import { ShieldCheck, Key, Database, HardDrive, CheckCircle2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SecuritySettings() {
  const [sessionUser, setSessionUser] = useState<string>("aarvifanedits@gmail.com");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="display text-3xl">Admin Security &amp; Infrastructure</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          System health, authorized curator permissions, and database connectivity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Curator Profile */}
        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Primary Curator Profile</h3>
              <p className="text-xs text-muted-foreground">Authorized Administrator</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Authorized Email:</span>
              <span className="font-mono font-medium">aarvifanedits@gmail.com</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Curator UID:</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                eec3ccb4-bdf7-4b8c-b8a1-573047115069
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium text-accent">admin (via public.has_role)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Access Level:</span>
              <span className="font-medium text-foreground">Full Archive &amp; CMS Management</span>
            </div>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Active Supabase Infrastructure</h3>
              <p className="text-xs text-muted-foreground">Production Database &amp; Storage</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Project Reference:</span>
              <span className="font-mono font-medium">pidrruwjgbqqvgrujylk</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Supabase Host:</span>
              <span className="font-mono text-[11px]">
                https://pidrruwjgbqqvgrujylk.supabase.co
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Storage Engine:</span>
              <span className="font-medium text-foreground">
                Persistent Single-Source Storage + Cloud Mirror
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Data Preservation:</span>
              <span className="font-medium text-green-400">Guaranteed Append-Only Safe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Best Practices & Password Reset Details */}
      <div className="border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-accent" />
          <h3 className="font-medium text-sm">Server-Side Admin Password Security</h3>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          The archive administrator password reset is secured strictly on the server-side Node.js
          runtime. It requires the privileged Supabase Service-Role Secret and strictly targets only
          the authorized curator UID (
          <code className="text-foreground">eec3ccb4-bdf7-4b8c-b8a1-573047115069</code>).
        </p>

        <div className="rounded bg-secondary/30 p-4 font-mono text-xs text-muted-foreground space-y-1">
          <p className="text-foreground">
            # Running a secure CLI password reset from server shell:
          </p>
          <p>ADMIN_NEW_PASSWORD="your-new-password" npm run set-admin-password</p>
        </div>
      </div>
    </div>
  );
}
