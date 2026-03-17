import { useEffect, useState } from "react";
import axiosClient from "src/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: Record<string, any> | null;
  onSuccess?: () => void;
};

const EditServerFormModal = ({
  open,
  onOpenChange,
  server,
  onSuccess,
}: Props) => {
  const [serverName, setServerName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (server && open) {
      setServerName(server.server_name || server.serverName || "");
    }
  }, [server, open]);

  const handleSubmit = async () => {
    if (!server) return;
    if (!serverName.trim()) {
      alert("Server name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await axiosClient.put(`/trader/servers/${server.id}`, {
        ...server,
        server_name: serverName,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to update server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg py-3 overflow-y-auto">
        <DialogHeader className="mt-3">
          <DialogTitle className="text-center">Edit Server</DialogTitle>
        </DialogHeader>

        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mt-4 flex flex-col gap-6">
            <div className="mt-2">
              <Label>Server Name</Label>
              <Input
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. Windows Server 1"
              />
            </div>

            <div className="mt-2">
              <Label>Server IP</Label>
              <Input
                value={server?.server_ip || server?.serverIp || ""}
                disabled
                className="opacity-60"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditServerFormModal;
