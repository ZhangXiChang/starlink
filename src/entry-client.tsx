//@refresh reload
import { mount, StartClient } from "@solidjs/start/client";

const app = document.getElementById("app");
if (!app) throw new Error("没有ID为app的Element");
mount(() => <StartClient />, app);
