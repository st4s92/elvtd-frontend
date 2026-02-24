import { useState, useEffect } from "react";
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
    onSuccess?: () => void;
    editData?: Record<string, any> | null;
};

const CreateSymbolMapFormModal = ({
    open,
    onOpenChange,
    onSuccess,
    editData,
}: Props) => {
    const [brokerName, setBrokerName] = useState("");
    const [brokerSymbol, setBrokerSymbol] = useState("");
    const [canonicalSymbol, setCanonicalSymbol] = useState("");

    useEffect(() => {
        if (open) {
            if (editData) {
                setBrokerName(editData.brokerName || "");
                setBrokerSymbol(editData.brokerSymbol || "");
                setCanonicalSymbol(editData.canonicalSymbol || "");
            } else {
                resetForm();
            }
        }
    }, [open, editData]);

    const resetForm = () => {
        setBrokerName("");
        setBrokerSymbol("");
        setCanonicalSymbol("");
    };

    const handleSubmit = async () => {
        if (!brokerName || !brokerSymbol || !canonicalSymbol) {
            alert("Please fill in all fields.");
            return;
        }

        const payload = {
            broker_name: brokerName.trim(),
            broker_symbol: brokerSymbol.trim(),
            canonical_symbol: canonicalSymbol.trim(),
        };

        try {
            if (editData && editData.id) {
                // Edit mode (assuming there is an Update endpoint)
                await axiosClient.put(`/trader/symbol-map/${editData.id}`, payload);
            } else {
                // Create mode
                await axiosClient.post("/trader/symbol-map", payload);
            }

            resetForm();
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            console.error(err);
            alert("Failed to save symbol map");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md py-3 overflow-y-auto">
                <DialogHeader className="mt-3">
                    <DialogTitle className="text-center">
                        {editData ? "Edit Symbol Map" : "Create Symbol Map"}
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[85vh] overflow-y-auto p-6">
                    <div className="flex flex-col gap-6">

                        {/* Broker Name */}
                        <div>
                            <Label>Broker Name</Label>
                            <Input
                                value={brokerName}
                                onChange={(e) => setBrokerName(e.target.value)}
                                placeholder="e.g. Finex Bisnis Solution"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Name of the broker EXACTLY as it appears in MT4/5.
                                Use "ANY" to match all brokers.
                            </p>
                        </div>

                        {/* Broker Symbol */}
                        <div>
                            <Label>Broker Symbol</Label>
                            <Input
                                value={brokerSymbol}
                                onChange={(e) => setBrokerSymbol(e.target.value)}
                                placeholder="e.g. US100.cash"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                The symbol as named by the broker. Case-sensitive.
                            </p>
                        </div>

                        {/* Canonical Symbol */}
                        <div>
                            <Label>Canonical Symbol</Label>
                            <Input
                                value={canonicalSymbol}
                                onChange={(e) => setCanonicalSymbol(e.target.value)}
                                placeholder="e.g. USTEC"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Your unified internal symbol name used by master signals.
                            </p>
                        </div>

                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>{editData ? "Save Changes" : "Submit Mapping"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateSymbolMapFormModal;
