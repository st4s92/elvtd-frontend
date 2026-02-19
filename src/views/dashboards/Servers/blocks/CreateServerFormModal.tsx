import { useState } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "src/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const CreateServerFormModal = ({
  open,
  onOpenChange,
  onSuccess,
}: Props) => {
  const [serverName, setServerName] = useState("");
  const [serverIp, setServerIp] = useState("100.100.100.100");
  const [serverOs, setServerOs] = useState("windows");

  const resetForm = () => {
    setServerName("");
    setServerIp("100.100.100.100");
    setServerOs("windows");
  };

  const handleSubmit = async () => {
    if(serverName == "" || serverIp == ""|| serverOs == "")
    {
      alert("recheck your data")
      return
    }
    const payload = {
      server_name: serverName,
      server_ip: serverIp,
      server_os: serverOs,
    };

    try {
      await axiosClient.post("/trader/servers", payload);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to create server");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg py-3 overflow-y-auto">
        <DialogHeader className="mt-3">
          <DialogTitle className="text-center">Add Server</DialogTitle>
        </DialogHeader>

        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mt-4 flex flex-col gap-6">
            {/* Server Name */}
            <div className="mt-2">
              <Label>Server Name</Label>
              <Input
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. Windows Server 1"
              />
            </div>

            {/* Server Ip */}
            <div className="mt-2">
              <Label>Server IP</Label>
              <Input
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder="e.g. 100.100.100.100"
              />
            </div>

            {/* Server OS */}
            <div className="mt-2">
              <Label>Server OS</Label>
              <Select 
                value={serverOs}
                defaultValue="Windows"
                onValueChange={ (val:string) => setServerOs(val) }
                >
                  <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Windows">Windows</SelectItem>
                    <SelectItem value="Ubuntu">Linux Ubuntu</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Server</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServerFormModal;
