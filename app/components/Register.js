'use client'

import { useState } from 'react'

export default function Register() {
  const [formData, setFormData] = useState({
    teamName: '',
    teamSize: '1',
    email: '',
    members: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    // Add your form submission logic here
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <section className="py-24 bg-background-dark" id="register">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-5xl font-bold text-text-dark">Join the <span className="text-primary">Grid</span></h2>
          <p className="mt-4 text-lg text-text-dark/80 max-w-2xl mx-auto">Assemble your crew and secure your spot. Teams can have up to 4 members.</p>
        </div>
        <div className="max-w-2xl mx-auto bg-card-dark p-8 md:p-12 rounded-xl shadow-2xl border border-secondary-dark">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-text-dark mb-2" htmlFor="team-name">Team Name</label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-secondary-dark focus:ring-primary focus:border-primary transition bg-background-dark text-text-dark placeholder-text-dark/60"
                  id="team-name"
                  name="teamName"
                  placeholder="e.g., Red-Bullish Coders"
                  type="text"
                  value={formData.teamName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-dark mb-2" htmlFor="team-size">Team Size</label>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-secondary-dark focus:ring-primary focus:border-primary transition bg-background-dark text-text-dark"
                  id="team-size"
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleChange}
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-text-dark mb-2" htmlFor="email">Team Captain&apos;s Email</label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-secondary-dark focus:ring-primary focus:border-primary transition bg-background-dark text-text-dark placeholder-text-dark/60"
                id="email"
                name="email"
                placeholder="you@example.com"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-bold text-text-dark mb-2" htmlFor="members">Team Member Emails (comma separated)</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-secondary-dark focus:ring-primary focus:border-primary transition bg-background-dark text-text-dark placeholder-text-dark/60"
                id="members"
                name="members"
                placeholder="member1@example.com, member2@example.com"
                rows={3}
                value={formData.members}
                onChange={handleChange}
              ></textarea>
            </div>
            <button
              className="w-full bg-primary text-white font-bold py-4 px-6 rounded-lg text-lg hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
              type="submit">
              <span className="material-icons mr-2">send</span>
              Submit Registration
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
