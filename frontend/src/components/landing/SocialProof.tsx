
const SocialProof = () => {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-16 text-center">
        <h2 className="text-4xl font-bold mb-16 text-gray-900 tracking-tight">
          Join 1,000+ Businesses Already Using AdGenie
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-4">94%</div>
            <p className="text-gray-700 font-medium text-lg">Increase in engagement</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-4">5min</div>
            <p className="text-gray-700 font-medium text-lg">Average setup time</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600 mb-4">24/7</div>
            <p className="text-gray-700 font-medium text-lg">AI marketing intern</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
