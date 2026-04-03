import React from 'react';

const stats = [
  {
    label: "Orders Fulfilled",
    value: "10,000+",
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
    ),
  },
  {
    label: "Happy Customers",
    value: "2,500+",
    icon: (
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    ),
  },
  {
    label: "Print Partners",
    value: "50+",
    icon: (
      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 15l4-4 4 4" /></svg>
    ),
  },
  {
    label: "Cities Reached",
    value: "15",
    icon: (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v10l6 4" /></svg>
    ),
  },
];

const ImpactSection = () => {
  return (
    <section className="w-full py-16 px-4 md:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Print Duka Impact at a Glance
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Empowering businesses and individuals with quality print solutions across Kenya.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition hover:shadow-md border border-gray-100 dark:border-gray-800"
          >
            <div className="mb-4">{stat.icon}</div>
            <div className="text-2xl md:text-3xl font-extrabold text-black mb-1">
              {stat.value}
            </div>
            <div className="text-base text-gray-900 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ImpactSection;
