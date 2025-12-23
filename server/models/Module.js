const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    yearId: {
        type: String,
        required: true,
        ref: 'Year'
    }
}, { timestamps: true });

// Index only yearId since id already has a unique index
moduleSchema.index({ yearId: 1 });

// Validation middleware for yearId
moduleSchema.pre('save', async function(next) {
    if (this.isModified('yearId')) {
        const { Year } = require('./Year');
        const year = await Year.findOne({ id: this.yearId });
        if (!year) {
            throw new Error(`Referenced Year ${this.yearId} does not exist`);
        }
    }
    next();
});

// Middleware to handle cascade deletion
moduleSchema.pre('deleteOne', { document: false, query: true }, async function() {
    const moduleId = this.getFilter().id;
    if (!moduleId) return;

    // Find all subjects for this module
    const { Subject } = require('./Subject');
    const subjects = await Subject.find({ moduleId });

    // Delete all subjects and their related content
    for (const subject of subjects) {
        await Subject.deleteOne({ id: subject.id });
    }
});

// Static method for reference validation
moduleSchema.statics.createWithValidation = async function(moduleData) {
    // Check if module already exists
    const existingModule = await this.findOne({ id: moduleData.id });
    if (existingModule) {
        throw new Error(`Module with ID ${moduleData.id} already exists`);
    }

    // Validate year reference
    const { Year } = require('./Year');
    const year = await Year.findOne({ id: moduleData.yearId });
    if (!year) {
        throw new Error(`Referenced Year ${moduleData.yearId} does not exist`);
    }

    return await this.create(moduleData);
};

// Static method to update with validation
moduleSchema.statics.updateWithValidation = async function(id, updateData) {
    const module = await this.findOne({ id });
    if (!module) {
        throw new Error(`Module with ID ${id} not found`);
    }
    
    // If updating the ID, check for conflicts
    if (updateData.id && updateData.id !== id) {
        const existing = await this.findOne({ id: updateData.id });
        if (existing) {
            throw new Error(`Module with ID ${updateData.id} already exists`);
        }
        
        // Update all subject references to the new module ID
        const { Subject } = require('./Subject');
        await Subject.updateMany({ moduleId: id }, { moduleId: updateData.id });
    }
    
    // If updating yearId, validate the new year exists
    if (updateData.yearId && updateData.yearId !== module.yearId) {
        const { Year } = require('./Year');
        const year = await Year.findOne({ id: updateData.yearId });
        if (!year) {
            throw new Error(`Referenced Year ${updateData.yearId} does not exist`);
        }
    }
    
    return await this.findOneAndUpdate({ id }, updateData, { new: true });
};

const Module = mongoose.model('Module', moduleSchema);

module.exports = { Module };

module.exports = { Module };