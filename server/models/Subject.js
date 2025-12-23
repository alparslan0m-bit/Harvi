const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    moduleId: {
        type: String,
        required: true,
        ref: 'Module'
    }
}, { timestamps: true });

// Index only moduleId since id already has a unique index
subjectSchema.index({ moduleId: 1 });

// Middleware to handle cascade deletion
subjectSchema.pre('deleteOne', { document: false, query: true }, async function() {
    const subjectId = this.getFilter().id;
    if (!subjectId) return;

    // Find all lectures for this subject
    const { Lecture } = require('./Lecture');
    const lectures = await Lecture.find({ subjectId });
    
    // Delete all lectures for this subject
    for (const lecture of lectures) {
        await Lecture.deleteOne({ id: lecture.id });
    }
});

// Static method for reference validation
subjectSchema.statics.createWithValidation = async function(subjectData) {
    // Check if subject already exists
    const existingSubject = await this.findOne({ id: subjectData.id });
    if (existingSubject) {
        throw new Error(`Subject with ID ${subjectData.id} already exists`);
    }

    // Validate module reference
    const { Module } = require('./Module');
    const module = await Module.findOne({ id: subjectData.moduleId });
    if (!module) {
        throw new Error(`Referenced Module ${subjectData.moduleId} does not exist`);
    }

    return await this.create(subjectData);
};

// Static method to update with validation
subjectSchema.statics.updateWithValidation = async function(id, updateData) {
    const subject = await this.findOne({ id });
    if (!subject) {
        throw new Error(`Subject with ID ${id} not found`);
    }
    
    // If updating the ID, check for conflicts
    if (updateData.id && updateData.id !== id) {
        const existing = await this.findOne({ id: updateData.id });
        if (existing) {
            throw new Error(`Subject with ID ${updateData.id} already exists`);
        }
        
        // Update all lecture references to the new subject ID
        const { Lecture } = require('./Lecture');
        await Lecture.updateMany({ subjectId: id }, { subjectId: updateData.id });
    }
    
    // If updating moduleId, validate the new module exists
    if (updateData.moduleId && updateData.moduleId !== subject.moduleId) {
        const { Module } = require('./Module');
        const module = await Module.findOne({ id: updateData.moduleId });
        if (!module) {
            throw new Error(`Referenced Module ${updateData.moduleId} does not exist`);
        }
    }
    
    return await this.findOneAndUpdate({ id }, updateData, { new: true });
};

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = { Subject };