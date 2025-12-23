const mongoose = require('mongoose');

const YearSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    icon: { 
        type: String 
    }
}, { 
    timestamps: true 
});

// Middleware to handle cascade deletion
YearSchema.pre('deleteOne', { document: false, query: true }, async function() {
    const yearId = this.getFilter().id;
    if (!yearId) return;

    // Find all modules for this year
    const { Module } = require('./Module');
    const modules = await Module.find({ yearId });
    
    // Delete all modules and their related content
    for (const module of modules) {
        await Module.deleteOne({ id: module.id });
    }
});

// Static method to create with validation
YearSchema.statics.createWithValidation = async function(yearData) {
    const existingYear = await this.findOne({ id: yearData.id });
    if (existingYear) {
        throw new Error(`Year with ID ${yearData.id} already exists`);
    }
    return await this.create(yearData);
};

// Static method to update with validation
YearSchema.statics.updateWithValidation = async function(id, updateData) {
    const year = await this.findOne({ id });
    if (!year) {
        throw new Error(`Year with ID ${id} not found`);
    }
    
    // If updating the ID, check for conflicts
    if (updateData.id && updateData.id !== id) {
        const existing = await this.findOne({ id: updateData.id });
        if (existing) {
            throw new Error(`Year with ID ${updateData.id} already exists`);
        }
        
        // Update all module references to the new year ID
        const { Module } = require('./Module');
        await Module.updateMany({ yearId: id }, { yearId: updateData.id });
    }
    
    return await this.findOneAndUpdate({ id }, updateData, { new: true });
};

module.exports.Year = mongoose.model('Year', YearSchema);


