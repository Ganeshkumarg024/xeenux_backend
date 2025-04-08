const mongoose = require('mongoose');
const config = require('../config/config');

const binaryNetworkSchema = new mongoose.Schema(
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
    // User's position in the binary tree
    position: {
      type: Number,
      enum: [0, 1], // 0 for left, 1 for right
      required: true
    },
    // Parent user ID in the binary network
    parentId: {
      type: Number,
      required: true
    },
    // Left and right child IDs
    leftChildId: {
      type: Number,
      default: 0
    },
    rightChildId: {
      type: Number,
      default: 0
    },
    // Business volumes
    leftVolume: {
      type: Number,
      default: 0
    },
    rightVolume: {
      type: Number,
      default: 0
    },
    // Carry forward volumes (after matching)
    leftCarryForward: {
      type: Number,
      default: 0
    },
    rightCarryForward: {
      type: Number,
      default: 0
    },
    // Historical volumes (total accumulated)
    totalLeftVolume: {
      type: Number,
      default: 0
    },
    totalRightVolume: {
      type: Number,
      default: 0
    },
    // Team counts
    leftCount: {
      type: Number,
      default: 0
    },
    rightCount: {
      type: Number,
      default: 0
    },
    // Last time binary income was processed
    lastBinaryProcess: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
binaryNetworkSchema.index({ userId: 1 });
binaryNetworkSchema.index({ parentId: 1 });
binaryNetworkSchema.index({ leftChildId: 1 });
binaryNetworkSchema.index({ rightChildId: 1 });

// Virtual field for total team count
binaryNetworkSchema.virtual('totalTeam').get(function() {
  return this.leftCount + this.rightCount;
});

// Virtual field for weaker leg volume
binaryNetworkSchema.virtual('weakerLegVolume').get(function() {
  return Math.min(this.leftVolume, this.rightVolume);
});

// Virtual field for stronger leg volume
binaryNetworkSchema.virtual('strongerLegVolume').get(function() {
  return Math.max(this.leftVolume, this.rightVolume);
});

// Static method to find the extreme placement position
binaryNetworkSchema.statics.findExtremePlacement = async function(parentId, position) {
  // Start with the parent
  let currentId = parentId;
  let currentNode = await this.findOne({ userId: currentId });
  
  if (!currentNode) {
    return null;
  }
  
  // Continue traversing down the tree until we find an empty spot
  while (true) {
    if (position === 0) { // Left position
      // If left child position is empty, we found our spot
      if (currentNode.leftChildId === 0) {
        return currentNode;
      }
      // Move to the left child
      currentId = currentNode.leftChildId;
    } else { // Right position
      // If right child position is empty, we found our spot
      if (currentNode.rightChildId === 0) {
        return currentNode;
      }
      // Move to the right child
      currentId = currentNode.rightChildId;
    }
    
    // Get the next node
    currentNode = await this.findOne({ userId: currentId });
    
    // Safety check - if we somehow reached an invalid node
    if (!currentNode) {
      return null;
    }
  }
};

// Static method to place a new member in the binary network
binaryNetworkSchema.statics.placeNewMember = async function(userId, referrerId, position) {
  // Find placement spot in the binary tree
  const placementNode = await this.findExtremePlacement(referrerId, position);
  
  if (!placementNode) {
    throw new Error('Cannot find placement position in binary tree');
  }
  
  // Create the new node
  const newNode = new this({
    userId,
    position,
    parentId: placementNode.userId
  });
  
  // Update the placement node with the new child
  if (position === 0) {
    placementNode.leftChildId = userId;
  } else {
    placementNode.rightChildId = userId;
  }
  
  // Save both nodes
  await Promise.all([
    newNode.save(),
    placementNode.save()
  ]);
  
  // Return the path from referrer to placement node
  return this.getPathFromReferrer(referrerId, placementNode.userId);
};

// Static method to get the path from referrer to placement node
binaryNetworkSchema.statics.getPathFromReferrer = async function(referrerId, placementId) {
  if (referrerId === placementId) {
    return [referrerId];
  }
  
  const path = [];
  let currentId = placementId;
  
  while (currentId !== referrerId) {
    path.unshift(currentId);
    
    // Get the parent node
    const currentNode = await this.findOne({ userId: currentId });
    if (!currentNode) break;
    
    currentId = currentNode.parentId;
  }
  
  // Add the referrer to the beginning of the path
  path.unshift(referrerId);
  
  return path;
};

// Static method to update volumes in the binary network
binaryNetworkSchema.statics.updateVolumes = async function(userId, amount) {
  console.log(`Updating binary volumes for userId: ${userId} with amount: ${amount}`);
  
  try {
    // Get the user's node
    const userNode = await this.findOne({ userId });
    
    if (!userNode) {
      console.error(`User ${userId} not found in binary network`);
      throw new Error(`User ${userId} not found in binary network`);
    }
    
    console.log(`Found user node with parentId: ${userNode.parentId}, position: ${userNode.position}`);
    
    // Start with the parent of the user
    let currentId = userNode.parentId;
    let position = userNode.position;
    
    // To prevent infinite loops, keep track of processed nodes
    const processedNodes = new Set();
    
    // Update volumes up the tree
    while (currentId !== 0) {
      console.log(`Processing parent: ${currentId}`);
      
      // Check if we've already processed this node (to prevent infinite loops)
      if (processedNodes.has(currentId)) {
        console.error(`Detected cycle in binary tree at node ${currentId}. Breaking loop.`);
        break;
      }
      
      // Add this node to processed set
      processedNodes.add(currentId);
      
      const parentNode = await this.findOne({ userId: currentId });
      
      if (!parentNode) {
        console.error(`Parent node ${currentId} not found`);
        break;
      }
      
      // Update the volume based on position
      if (position === 0) {
        parentNode.leftVolume += amount;
        parentNode.totalLeftVolume += amount;
        console.log(`Updated left volume for ${currentId} to ${parentNode.leftVolume}`);
      } else {
        parentNode.rightVolume += amount;
        parentNode.totalRightVolume += amount;
        console.log(`Updated right volume for ${currentId} to ${parentNode.rightVolume}`);
      }
      
      await parentNode.save();
      
      // Break the loop if the parent points to itself
      if (parentNode.parentId === currentId) {
        console.error(`Node ${currentId} has itself as parent. Breaking loop.`);
        break;
      }
      
      // Move up to the next parent
      position = parentNode.position;
      currentId = parentNode.parentId;
    }
    
    console.log('Binary volume update completed successfully');
    return true;
  } catch (error) {
    console.error('Error updating binary volumes:', error);
    throw error;
  }
};

// Static method to calculate binary income
binaryNetworkSchema.statics.calculateBinaryIncome = async function(userId, userPackages) {
  // Get the user's node
  const userNode = await this.findOne({ userId });
  
  if (!userNode) {
    return { matchingVolume: 0, binaryIncome: 0, carryForward: { left: 0, right: 0 } };
  }
  
  // Calculate the matching volume (weaker leg)
  const matchingVolume = Math.min(userNode.leftVolume, userNode.rightVolume);
  
  if (matchingVolume === 0) {
    return { matchingVolume: 0, binaryIncome: 0, carryForward: { left: userNode.leftVolume, right: userNode.rightVolume } };
  }
  
  // Calculate binary income (percentage of matching volume)
  let binaryIncome = (matchingVolume * config.xeenux.binaryFee) / 100;
  
  // Apply daily ceiling limit based on user's package
  const maxPackageAmount = userPackages.reduce((max, pkg) => {
    return pkg.isActive && pkg.amount > max ? pkg.amount : max;
  }, 0);
  
  if (binaryIncome > maxPackageAmount) {
    binaryIncome = maxPackageAmount;
  }
  
  // Calculate carry forward volumes
  const leftCarryForward = userNode.leftVolume - matchingVolume;
  const rightCarryForward = userNode.rightVolume - matchingVolume;
  
  // Update the node with new carry forward values and reset volumes
  userNode.leftCarryForward = leftCarryForward;
  userNode.rightCarryForward = rightCarryForward;
  userNode.leftVolume = leftCarryForward;
  userNode.rightVolume = rightCarryForward;
  userNode.lastBinaryProcess = new Date();
  
  await userNode.save();
  
  return {
    matchingVolume,
    binaryIncome,
    carryForward: {
      left: leftCarryForward,
      right: rightCarryForward
    }
  };
};

// Method to get binary tree structure for display
binaryNetworkSchema.statics.getBinaryTreeStructure = async function(userId, depth = 2) {
  const rootNode = await this.findOne({ userId });
  
  if (!rootNode) {
    return null;
  }
  
  // Function to build tree recursively
  const buildTree = async (currentId, currentDepth) => {
    if (currentId === 0 || currentDepth > depth) {
      return { userId: 0, name: 'Empty', isEmpty: true };
    }
    
    const node = await this.findOne({ userId: currentId })
      .populate('user', 'name userId');
    
    if (!node) {
      return { userId: 0, name: 'Empty', isEmpty: true };
    }
    
    // Base node data
    const nodeData = {
      userId: node.userId,
      name: node.user?.name || 'Unknown',
      position: node.position,
      leftVolume: node.leftVolume,
      rightVolume: node.rightVolume,
      totalLeftVolume: node.totalLeftVolume,
      totalRightVolume: node.totalRightVolume,
      isEmpty: false
    };
    
    // Add children if we haven't reached the max depth
    if (currentDepth < depth) {
      nodeData.left = await buildTree(node.leftChildId, currentDepth + 1);
      nodeData.right = await buildTree(node.rightChildId, currentDepth + 1);
    }
    
    return nodeData;
  };
  
  // Start building the tree from the root node
  return await buildTree(userId, 0);
};

const BinaryNetwork = mongoose.model('BinaryNetwork', binaryNetworkSchema);

module.exports = BinaryNetwork;