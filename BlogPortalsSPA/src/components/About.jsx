import React, { useState } from "react";
import profilePic from "./images/shashank.jpg";
import microsoftLogo from "./images/microsoft_logo.jpg";

const About = () => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="about-page">
      <div className="linkedin-container">
        <div className="banner">
          <img
            className="banner-image"
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=80"
            alt="Profile cover"
          />
          <div className="camera-icon">📷</div>
        </div>

        <div className="profile-wrapper">
          <div className="profile-left">
            {imageFailed ? (
              <div className="profile-pic profile-pic-fallback" aria-label="Shashank Bhide">
                SB
              </div>
            ) : (
              <img
                className="profile-pic"
                src={profilePic}
                alt="Shashank Bhide"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
            )}

            <div className="profile-details">
              <h1>
                Shashank Bhide <span className="badge">✔</span>{" "}
                <span className="pronouns">He/Him</span>
              </h1>

              <p className="headline">
                Principal Architect at Kerv Digital, Ex. Microsoft, Power platform,
                Azure and bodybuilding architect. Strength coach. I help enterprises
                unlock business value by bridging Dataverse with AI-driven automation at scale.
              </p>

              <p className="location">
                Hyderabad, Telangana, India · <span className="link">Contact info</span>
              </p>

              <p className="connections">500+ connections</p>

              <div className="action-row">
                <a
                  href="https://www.linkedin.com/in/shashank-bhide-9369b414/"
                  target="_blank"
                  rel="noreferrer"
                  className="action-btn action-btn-primary linkedin-btn"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="linkedin-icon">
                    <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.86-3.04c-1.86 0-2.14 1.45-2.14 2.94v5.67H9.33V9h3.42v1.56h.05c.48-.9 1.64-1.86 3.38-1.86c3.62 0 4.28 2.38 4.28 5.48v6.27zM5.31 7.43a2.06 2.06 0 1 1 0-4.12a2.06 2.06 0 0 1 0 4.12zM7.09 20.45H3.53V9h3.56v11.45zM22.23 0H1.77A1.77 1.77 0 0 0 0 1.77v20.46C0 23.2.79 24 1.77 24h20.46A1.77 1.77 0 0 0 24 22.23V1.77A1.77 1.77 0 0 0 22.23 0z" />
                  </svg>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
          </div>

          <div className="profile-right">
            <div className="company">
              <div className="logo purple">kerv</div>
              <span>Kerv Digital</span>
            </div>

            <div className="company">
              <img className="logo company-logo-img" src={microsoftLogo} alt="Microsoft logo" />
              <span>Microsoft</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
