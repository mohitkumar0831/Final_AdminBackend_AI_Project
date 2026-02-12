// migrations/addMailStatusFields.js
import mongoose from 'mongoose';
import JD from '../models/jobDescription.js';
import { config } from '../config/index.js';

const migrateMailStatusFields = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Update all JD documents: add default values to existing appliedCandidates
    const result = await JD.updateMany(
      { 'appliedCandidates': { $exists: true } },
      [
        {
          $set: {
            appliedCandidates: {
              $map: {
                input: '$appliedCandidates',
                as: 'candidate',
                in: {
                  $mergeObjects: [
                    '$$candidate',
                    {
                      mailStatus: {
                        $cond: [{ $ifNull: ['$$candidate.mailStatus', false] }, '$$candidate.mailStatus', 'not_sent']
                      },
                      mailSentAt: {
                        $cond: [{ $ifNull: ['$$candidate.mailSentAt', false] }, '$$candidate.mailSentAt', null]
                      },
                      testCompletedAt: {
                        $cond: [{ $ifNull: ['$$candidate.testCompletedAt', false] }, '$$candidate.testCompletedAt', null]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} JD documents`);
    console.log(`Matched documents: ${result.matchedCount}`);

    // Also show some sample data to verify
    const sample = await JD.findOne({ 'appliedCandidates': { $exists: true } }).limit(1);
    if (sample && sample.appliedCandidates && sample.appliedCandidates.length > 0) {
      console.log('\n📋 Sample appliedCandidate after migration:');
      console.log(JSON.stringify(sample.appliedCandidates[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run migration
migrateMailStatusFields();