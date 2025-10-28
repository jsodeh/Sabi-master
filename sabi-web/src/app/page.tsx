import Header from '@/components/Header';
import Placeholder from '@/components/Placeholder';
import FaqItem from '@/components/FaqItem';

const faqData = [
  {
    question: "How do I get started?",
    answer: "Download the application and the browser extension, sign up for an account, and start your first learning session."
  },
  {
    question: "What programming languages does Sabi support?",
    answer: "Sabi is language-agnostic and works with any programming language by observing your interactions with code and documentation."
  },
  {
    question: "Which AI models power Sabi?",
    answer: "Sabi uses a variety of state-of-the-art AI models to provide the most accurate and relevant assistance."
  },
  {
    question: "How much does it cost?",
    answer: "Sabi is currently free during the preview period. We will announce pricing plans in the future."
  },
  {
    question: "Need help or have feedback?",
    answer: "You can contact us through the forum or the contact link in the footer."
  }
];

export default function Home() {
  return (
    <div className="bg-brand-dark text-white">
      <Header />
      <main className="pt-20">
        <section className="relative text-center py-24 md:py-40 flex flex-col items-center">
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-green/20 to-transparent -translate-y-1/2 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="inline-block bg-gray-800/50 border border-gray-700 rounded-full px-3 py-1 text-sm mb-4">
              Free Access During Preview
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
              Agentic Coding Platform for Real Software
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Think Deeper. Build Better.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button className="bg-brand-green text-black font-semibold px-6 py-3 rounded-md flex items-center gap-2 hover:bg-green-400 transition-colors duration-300">
                <Apple className="w-5 h-5" /> Download
              </button>
              <button className="bg-gray-800 text-white font-semibold px-6 py-3 rounded-md hover:bg-gray-700 transition-colors duration-300">
                All Downloads
              </button>
            </div>
          </div>
        </section>

        {/* Programming Through Conversation Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl sm:text-center">
              <h2 className="text-base font-semibold leading-7 text-brand-green">Programming Through Conversation</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Powered by an enhanced context engine</p>
              <p className="mt-6 text-lg leading-8 text-gray-400">
                Our agents learn from the codebase and relevant documentation to autonomously plan and edit your entire project based on simple prompts.
              </p>
            </div>
          </div>
          <div className="mt-16 sm:mt-20">
            <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
              <Placeholder />
            </div>
          </div>
        </section>

        {/* Quest Mode Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
              <div className="lg:pr-8 lg:pt-4">
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 text-brand-green">Quest Mode: Delegate Tasks to Agents</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Describe your task with specifications</p>
                  <p className="mt-6 text-lg leading-8 text-gray-400">
                    Our agents will complete the planning, coding, and testing, and deliver polished results asynchronously.
                  </p>
                </div>
              </div>
              <div className="-m-2 rounded-xl bg-green-500/10 p-2 ring-1 ring-inset ring-green-500/20 lg:-m-4 lg:rounded-2xl lg:p-4">
                 <Placeholder />
              </div>
            </div>
          </div>
        </section>

        {/* Deeper Section */}
        <section className="py-24 sm:py-32 text-center">
            <p className="text-gray-400">Why Sabi</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mt-4">
                Not just another AI IDE.
            </h2>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight">
                Sabi thinks <span className="text-brand-green">{`{ deeper }`}</span> to solve
            </h2>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight">
                real software challenges.
            </h2>
        </section>

        {/* What Makes Agents Excellent Section */}
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">What Makes Our Agents Excellent</h2>
                <p className="mt-4 text-lg leading-8 text-gray-400">Full context. Deeper insight. Build your way.</p>
                <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <Search className="h-8 w-8 text-brand-green" />
                        <h3 className="mt-4 text-lg font-semibold leading-7 text-white">Intelligent Codebase Search</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Instantly pinpoint relevant code across your entire codebase.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <GitBranch className="h-8 w-8 text-brand-green" />
                        <h3 className="mt-4 text-lg font-semibold leading-7 text-white">Advanced Repository Insight</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Resolve issues with precision based on deep architectural understanding of your codebase.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <BrainCircuit className="h-8 w-8 text-brand-green" />
                        <h3 className="mt-4 text-lg font-semibold leading-7 text-white">Memory for Continuous Improvement</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Adapts to you, learning from every interaction in your chat to be smarter.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <ToyBrick className="h-8 w-8 text-brand-green" />
                        <h3 className="mt-4 text-lg font-semibold leading-7 text-white">Tool Use</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Perceive additional context and execute various actions with built-in and MCP tools.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Unlock Capabilities Section */}
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Unlock More AI Coding Capabilities for Developers</h2>
                <p className="mt-4 text-lg leading-8 text-gray-400">Full of power. Free from noise.</p>
                <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Always the Best Model</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Optimal model. More productivity. Fewer decisions.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Tab It, Get It</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Context-aware completions and smart next-edit suggestions.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Comprehensive Context</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Images, code, directories, and more.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">"Wikilize" Your Codebase</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Uncovers architecture and design.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Memory and Rules</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Learns from you and works in your way.</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Inline Chat</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Chat or refactor code inline, without context switching.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Key Concepts Section */}
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">The Key Concepts Behind</h2>
                <p className="mt-4 text-lg leading-8 text-gray-400">Three concepts that guide everything we do.</p>
                <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Enhanced Context Engineering</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Our advanced context engine combines deep codebase analysis with adaptive memory, delivering smarter AI that truly evolves with you.</p>
                    </div>
                    <div className="p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Knowledge Visibility</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Make your codebase truly understandable - for both humans and AI. Clear visibility reduces hallucinations and improves alignment.</p>
                    </div>
                    <div className="p-8 text-left">
                        <h3 className="text-lg font-semibold leading-7 text-white">Spec-Driven Development</h3>
                        <p className="mt-2 text-base leading-7 text-gray-400">Start by writing specs to clarify requirements. Then delegate implementation - stay in control while AI automates execution. Fewer iterations. Faster delivery.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">FAQs</h2>
                <div className="mt-16 space-y-4">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-left flex justify-between items-center">
                        <h3 className="text-lg font-semibold leading-7 text-white">How do I get started?</h3>
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-left flex justify-between items-center">
                        <h3 className="text-lg font-semibold leading-7 text-white">What programming languages does Sabi support?</h3>
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-left flex justify-between items-center">
                        <h3 className="text-lg font-semibold leading-7 text-white">Which AI models power Sabi?</h3>
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-left flex justify-between items-center">
                        <h3 className="text-lg font-semibold leading-7 text-white">How much does it cost?</h3>
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-left flex justify-between items-center">
                        <h3 className="text-lg font-semibold leading-7 text-white">Need help or have feedback?</h3>
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 sm:py-32 text-center">
            <div className="w-16 h-16 bg-brand-green rounded-2xl mx-auto"></div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mt-8">
                Ready to Build Real Software?
            </h2>
            <p className="mt-4 text-lg text-gray-400">Start Your Free Trial</p>
            <div className="mt-8">
                <button className="bg-white text-black font-semibold px-6 py-3 rounded-md flex items-center gap-2 mx-auto hover:bg-gray-200">
                    <Apple className="w-5 h-5" /> Download
                </button>
            </div>
        </section>

        <div className="mt-8">
          <button onClick={testBackend} className="bg-blue-500 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-400 transition-colors duration-300">
            Test Backend Connection
          </button>
          {backendResponse && <p className="mt-4 text-gray-400">{backendResponse}</p>}
        </div>

        {/* Footer */}
        <footer className="py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 md:p-16">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <div className="w-8 h-8 bg-brand-green rounded-lg"></div>
                            <p className="text-xl font-bold mt-4">Sabi</p>
                            <p className="text-sm text-gray-400 mt-2">&copy; 2025 Sabi. All rights reserved.</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Product</h3>
                            <ul className="mt-4 space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white">Pricing</a></li>
                                <li><a href="#" className="hover:text-white">Downloads</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Resources</h3>
                            <ul className="mt-4 space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white">Docs</a></li>
                                <li><a href="#" className="hover:text-white">Blog</a></li>
                                <li><a href="#" className="hover:text-white">FAQs</a></li>
                                <li><a href="#" className="hover:text-white">Changelog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Terms</h3>
                            <ul className="mt-4 space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Connect</h3>
                            <ul className="mt-4 space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white">Contact</a></li>
                                <li><a href="#" className="hover:text-white">Forum</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

      </main>
    </div>     </div>
            </div>
        </footer>

      </main>
    </div>