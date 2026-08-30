import { CelsiusScout } from "@/components/celsius-scout";
import { experienceCohorts } from "@/server/cohort-registry";

export default function Home() {
  return <CelsiusScout cohorts={experienceCohorts} />;
}
