import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";
import Loading from "~/components/widgets/loading";

export default function Index() {
  const navigate = useNavigate();
  onMount(() => navigate("auth"));
  return <Loading />;
}
