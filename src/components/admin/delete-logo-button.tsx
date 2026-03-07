
"use client";

import { useTransition } from "react";
import { deleteGlobalLogo } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteLogoButton({ logoId }: { logoId: string }) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this global logo? This action cannot be undone and may fail if the logo is currently in use by any token.")) {
      startDeleteTransition(async () => {
        const result = await deleteGlobalLogo(logoId);
        if (result.status === "error") {
          toast({
            variant: "destructive",
            title: "Error Deleting Logo",
            description: result.message,
          });
        } else {
          toast({
            title: "Success",
            description: result.message,
          });
        }
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-900"
      title="Delete Global Logo"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

    