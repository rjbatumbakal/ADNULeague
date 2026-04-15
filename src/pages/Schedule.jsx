import SectionHeading from '../components/ui/SectionHeading'
import ScheduleTable from '../features/schedule/ScheduleTable'

function Schedule() {
  return (
    <div className="w-full px-4 py-10 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="Schedule"
        title="Day 1 to Day 5 Event Schedule"
        description="Stay updated with the complete list of sports, schedules, and venues for all ADNU League Season 3 events."
      />
      <ScheduleTable />
    </div>
  )
}

export default Schedule
