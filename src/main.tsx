/* @refresh reload */
import { render } from "solid-js/web";
import App from "~/ui/App";
import "./main.css";

const root = document.getElementById("app");
render(() => <App />, root!);
