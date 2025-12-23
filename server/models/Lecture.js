const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true, validate: [
        {
            validator: function(options) {
                return options.length >= 2; // At least 2 options required
            },
            message: 'Question must have at least 2 options'
        },
        {
            validator: function(options) {
                return new Set(options).size === options.length; // Check for duplicates
            },
            message: 'Options must be unique'
        }
    ]},
    correctAnswer: { 
        type: Number, 
        required: true,
        validate: {
            validator: function(value) {
                return value >= 0 && value < this.options.length;
            },
            message: 'Correct answer index must be within the range of options'
        }
    }
}, { _id: false });

const LectureSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    subjectId: {
        type: String,
        required: false, // Optional to allow lectures to exist without being assigned to a subject
        ref: 'Subject'
    },
    questions: { 
        type: [QuestionSchema], 
        default: [],
        validate: {
            validator: function(questions) {
                // Check for duplicate question IDs
                const ids = questions.map(q => q.id);
                return new Set(ids).size === ids.length;
            },
            message: 'Question IDs must be unique within a lecture'
        }
    }
}, { timestamps: true });

// No need for explicit index since we have unique: true on id field

// Static method for creating with validation
LectureSchema.statics.createWithValidation = async function(lectureData) {
    // Check if lecture already exists
    const existingLecture = await this.findOne({ id: lectureData.id });
    if (existingLecture) {
        throw new Error(`Lecture with ID ${lectureData.id} already exists`);
    }

    // Validate questions if provided
    if (lectureData.questions) {
        for (const question of lectureData.questions) {
            if (question.correctAnswer >= question.options.length) {
                throw new Error(`Invalid correct answer index for question ${question.id}`);
            }
        }
    }

    return await this.create(lectureData);
};

// Method to add a question safely
LectureSchema.methods.addQuestion = async function(questionData) {
    if (this.questions.find(q => q.id === questionData.id)) {
        throw new Error(`Question with ID ${questionData.id} already exists in this lecture`);
    }

    if (questionData.correctAnswer >= questionData.options.length) {
        throw new Error('Correct answer index must be within the range of options');
    }

    this.questions.push(questionData);
    return await this.save();
};

// Static method to update with validation
LectureSchema.statics.updateWithValidation = async function(id, updateData) {
    const lecture = await this.findOne({ id });
    if (!lecture) {
        throw new Error(`Lecture with ID ${id} not found`);
    }
    
    // If updating the ID, check for conflicts
    if (updateData.id && updateData.id !== id) {
        const existing = await this.findOne({ id: updateData.id });
        if (existing) {
            throw new Error(`Lecture with ID ${updateData.id} already exists`);
        }
    }
    
    // If updating subjectId, validate the new subject exists
    if (updateData.subjectId && updateData.subjectId !== lecture.subjectId) {
        const { Subject } = require('./Subject');
        const subject = await Subject.findOne({ id: updateData.subjectId });
        if (!subject) {
            throw new Error(`Referenced Subject ${updateData.subjectId} does not exist`);
        }
    }
    
    // Validate questions if provided
    if (updateData.questions) {
        for (const question of updateData.questions) {
            if (question.correctAnswer >= question.options.length) {
                throw new Error(`Invalid correct answer index for question ${question.id}`);
            }
        }
    }
    
    return await this.findOneAndUpdate({ id }, updateData, { new: true });
};

module.exports.Lecture = mongoose.model('Lecture', LectureSchema);


