const mongoose = require('mongoose');

const teamStructureSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: [true, 'User ID is required'],
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    // Store team members by level
    team: {
      type: Map,
      of: [Number],
      default: () => new Map([
        ['level1', []],
        ['level2', []],
        ['level3', []],
        ['level4', []],
        ['level5', []],
        ['level6', []],
        ['level7', []]
      ])
    },
    // Store volume by level
    volume: {
      type: Map,
      of: Number,
      default: () => new Map([
        ['level1', 0],
        ['level2', 0],
        ['level3', 0],
        ['level4', 0],
        ['level5', 0],
        ['level6', 0],
        ['level7', 0]
      ])
    },
    // Store number of members with each rank in team
    teamRanks: {
      type: Map,
      of: Number,
      default: () => new Map([
        ['rank0', 0], // None
        ['rank1', 0], // Silver
        ['rank2', 0], // Gold
        ['rank3', 0], // Platinum
        ['rank4', 0]  // Diamond
      ])
    },
    // Total direct team
    directTeam: {
      type: Number,
      default: 0
    },
    // Total team across all levels
    totalTeam: {
      type: Number,
      default: 0
    },
    // Direct business volume
    directBusiness: {
      type: Number,
      default: 0
    },
    // Total business volume
    totalBusiness: {
      type: Number,
      default: 0
    },
    // Last update timestamp
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
teamStructureSchema.index({ userId: 1 });

// Virtual to get team size at specific level
teamStructureSchema.virtual('teamSizeAtLevel').get(function() {
  const sizes = {};
  for (let i = 1; i <= 7; i++) {
    const levelKey = `level${i}`;
    sizes[levelKey] = this.team.get(levelKey)?.length || 0;
  }
  return sizes;
});

// Method to add a member to the team
teamStructureSchema.methods.addTeamMember = function(memberId, level) {
  const levelKey = `level${level}`;
  
  // Check if level exists in the map
  if (!this.team.has(levelKey)) {
    this.team.set(levelKey, []);
  }
  
  // Add member to the level if not already present
  const members = this.team.get(levelKey);
  if (!members.includes(memberId)) {
    members.push(memberId);
    this.team.set(levelKey, members);
    
    // Update total team count
    this.totalTeam += 1;
    
    // Update direct team count if level is 1
    if (level === 1) {
      this.directTeam += 1;
    }
  }
  
  // Mark the document as modified
  this.markModified('team');
};

// Method to update volume at a specific level
teamStructureSchema.methods.updateVolumeAtLevel = function(level, amount) {
  const levelKey = `level${level}`;
  
  // Check if level exists in the map
  if (!this.volume.has(levelKey)) {
    this.volume.set(levelKey, 0);
  }
  
  // Add to the volume
  const currentVolume = this.volume.get(levelKey);
  this.volume.set(levelKey, currentVolume + amount);
  
  // Update total business volume
  this.totalBusiness += amount;
  
  // Update direct business volume if level is 1
  if (level === 1) {
    this.directBusiness += amount;
  }
  
  // Mark the document as modified
  this.markModified('volume');
};

// Method to update rank counts
teamStructureSchema.methods.updateTeamRank = function(oldRank, newRank) {
  if (oldRank === newRank) return;
  
  // Decrement old rank count
  if (oldRank >= 0) {
    const oldRankKey = `rank${oldRank}`;
    const oldRankCount = this.teamRanks.get(oldRankKey) || 0;
    if (oldRankCount > 0) {
      this.teamRanks.set(oldRankKey, oldRankCount - 1);
    }
  }
  
  // Increment new rank count
  const newRankKey = `rank${newRank}`;
  const newRankCount = this.teamRanks.get(newRankKey) || 0;
  this.teamRanks.set(newRankKey, newRankCount + 1);
  
  // Mark the document as modified
  this.markModified('teamRanks');
};

// Static method to get team information with pagination
teamStructureSchema.statics.getTeamMembers = async function(userId, level, page = 1, limit = 10) {
  const teamStructure = await this.findOne({ userId });
  
  if (!teamStructure) {
    return {
      members: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    };
  }
  
  const levelKey = `level${level}`;
  const memberIds = teamStructure.team.get(levelKey) || [];
  const total = memberIds.length;
  
  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedIds = memberIds.slice(start, end);
  
  // Get user details for the paginated IDs
  const User = mongoose.model('User');
  const members = await User.find({ userId: { $in: paginatedIds } })
    .select('userId name email walletAddress registeredAt');
  
  return {
    members,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Static method to update team structure when a new user joins
teamStructureSchema.statics.updateTeamForNewMember = async function(newUserId, referrerIdPath, volume) {
  for (let i = 0; i < referrerIdPath.length; i++) {
    const referrerId = referrerIdPath[i];
    const level = i + 1;
    
    // Skip if we've reached maximum levels
    if (level > 7) break;
    
    // Find or create team structure for the referrer
    let teamStructure = await this.findOne({ userId: referrerId });
    
    if (!teamStructure) {
      const User = mongoose.model('User');
      const referrer = await User.findOne({ userId: referrerId });
      
      if (!referrer) continue;
      
      teamStructure = new this({
        userId: referrerId,
        user: referrer._id
      });
    }
    
    // Add member to team and update volume
    teamStructure.addTeamMember(newUserId, level);
    teamStructure.updateVolumeAtLevel(level, volume);
    teamStructure.lastUpdated = new Date();
    
    await teamStructure.save();
  }
};

const TeamStructure = mongoose.model('TeamStructure', teamStructureSchema);

module.exports = TeamStructure;