import React, { useState } from "react";

// Dummy data for support tickets
const dummyTickets = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  subject: `Support Ticket #${i + 1}`,
  status: i % 3 === 0 ? "Open" : i % 3 === 1 ? "Pending" : "Closed",
  created: new Date(Date.now() - i * 86400000).toLocaleDateString(),
  description: `This is a description for support ticket #${i + 1}.`
}));

function TicketList({ tickets, onSelect }) {
  return (
    <div className="overflow-y-auto h-64 border rounded-lg p-2 bg-[#1a2a36]">
      {tickets.map(ticket => (
        <div
          key={ticket.id}
          className="p-3 mb-2 rounded-lg cursor-pointer hover:bg-[#2c5364] transition"
          onClick={() => onSelect(ticket)}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-cyan-300">{ticket.subject}</span>
            <span className={`text-xs px-2 py-1 rounded ${ticket.status === "Open" ? "bg-green-700" : ticket.status === "Pending" ? "bg-yellow-700" : "bg-gray-700"}`}>
              {ticket.status}
            </span>
          </div>
          <div className="text-xs text-cyan-100 opacity-70">{ticket.created}</div>
        </div>
      ))}
    </div>
  );
}

function TicketDetail({ ticket, onClose }) {
  if (!ticket) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#232526] p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-xl font-bold text-cyan-300 mb-2">{ticket.subject}</h2>
        <div className="mb-2 text-sm text-cyan-200">Status: <span className="font-semibold">{ticket.status}</span></div>
        <div className="mb-4 text-cyan-100">{ticket.description}</div>
        <button
          className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SupportForm({ onSubmit }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (subject && description) {
      onSubmit({ subject, description, status: "Open", created: new Date().toLocaleDateString() });
      setSubject("");
      setDescription("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1a2a36] p-4 rounded-lg mb-6">
      <h3 className="text-lg font-bold text-cyan-300 mb-2">Submit a Support Ticket</h3>
      <input
        type="text"
        placeholder="Subject"
        className="w-full mb-2 p-2 rounded bg-[#232526] text-white"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        required
      />
      <textarea
        placeholder="Describe your issue..."
        className="w-full mb-2 p-2 rounded bg-[#232526] text-white"
        value={description}
        onChange={e => setDescription(e.target.value)}
        required
        rows={3}
      />
      <button
        type="submit"
        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition"
      >
        Submit
      </button>
    </form>
  );
}

const Support = () => {
  const [tickets, setTickets] = useState(dummyTickets);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleNewTicket = ticket => {
    setTickets([{ ...ticket, id: tickets.length + 1 }, ...tickets]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-cyan-400 mb-6 futuristic-font">Support Center</h1>
        <SupportForm onSubmit={handleNewTicket} />
        <h2 className="text-xl font-bold text-cyan-300 mb-2">Your Tickets</h2>
        <TicketList tickets={tickets} onSelect={setSelectedTicket} />
        <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      </div>
      {/* Random filler content for 200 lines */}
      <div className="mt-10 text-cyan-100 opacity-60 text-xs">
        {[...Array(100)].map((_, i) => (
          <div key={i}>Support FAQ #{i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque euismod, nisi eu consectetur.</div>
        ))}
        {[...Array(80)].map((_, i) => (
          <div key={i + 100}>Tip #{i + 1}: For faster support, please provide as much detail as possible in your ticket.</div>
        ))}
        {[...Array(20)].map((_, i) => (
          <div key={i + 180}>Notice #{i + 1}: Our support team is available 24/7 to assist you.</div>
        ))}
      </div>
    </div>
  );
};

export default Support;