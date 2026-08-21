import { createFileRoute } from "@tanstack/react-router";
import { SpriteLab } from "@/components/sprite-lab";

export const Route = createFileRoute("/sprites")({ component: SpriteLab });
