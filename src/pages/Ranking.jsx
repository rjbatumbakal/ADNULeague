import SectionHeading from "../components/ui/SectionHeading";
import Rankings from "../features/ranking/Rankings";

function Ranking() {
  return (
    <div className="w-full px-4 py-10 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="Ranking"
        title="Department Standings and Event Rankings"
        description="The race for the championship is on! See where your department stands in the overall medal tally or dive into specific event results."
      />
      <Rankings />
    </div>
  );
}

export default Ranking;
