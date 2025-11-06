import { mount } from "svelte";
import App from "@/views/App.svelte";
import "./tailwind.css";

const target = document.getElementById("app")!;
const app = mount(App, { target });

export default app;
