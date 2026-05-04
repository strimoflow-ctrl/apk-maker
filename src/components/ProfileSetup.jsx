import React, { useState } from 'react';
import { setupUserProfile } from '../services/firebase';

const ProfileSetup = ({ userId, onComplete }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !gender) return;

    await setupUserProfile(userId, name, gender);
    onComplete();
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-card">
        <h2>Welcome!</h2>
        <p>Please setup your profile to enter the chat.</p>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Your Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Enter your name" 
              maxLength={20}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Gender</label>
            <div className="gender-options">
              <label className={`gender-btn ${gender === 'Male' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="gender" 
                  value="Male" 
                  onChange={() => setGender('Male')} 
                  required 
                  className="hidden-radio"
                />
                Male
              </label>
              <label className={`gender-btn ${gender === 'Female' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="gender" 
                  value="Female" 
                  onChange={() => setGender('Female')} 
                  required 
                  className="hidden-radio"
                />
                Female
              </label>
            </div>
          </div>
          
          <button type="submit" className="setup-submit-btn" disabled={!name.trim() || !gender}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
