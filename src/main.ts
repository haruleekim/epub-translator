import { mount } from "svelte";
import App from "@/ui/App.svelte";
import "./tailwind.css";

const _target = document.getElementById("app")!;
const app = mount(App, { target });

export default app;
