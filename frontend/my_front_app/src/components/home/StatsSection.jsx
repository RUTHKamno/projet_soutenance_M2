import StatCard from "./StatCard";

import { statistics } from "../../data/homeData";

import "../../styles/home/StatsSection.css";

const StatsSection = () => {

    return (

        <section className="stats-section">

            <div className="stats-container">

                {

                    statistics.map((stat, index) => (

                        <StatCard

                            key={index}

                            value={stat.value}

                            label={stat.label}

                            delay={index * 200}

                        />

                    ))

                }

            </div>

        </section>

    );

};

export default StatsSection;