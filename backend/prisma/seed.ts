import { PrismaClient, Role, CanonicalStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system state...');

  // Create default admin user
  const adminEmail = 'admin@jira-monitor.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123456', salt);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Lead Project Manager',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log('Created admin user: admin@jira-monitor.com / admin123456');
  }

  // Seed QA Rules
  const qaRules = [
    { key: 'GIT_COMMIT', name: 'Git Commit Linked', description: 'At least one Git commit referencing the issue key must exist' },
    { key: 'PULL_REQUEST', name: 'Pull Request Open/Merged', description: 'A Pull Request must be created and linked to the issue' },
    { key: 'CODE_REVIEW', name: 'Code Review Approved', description: 'Pull request must have an APPROVED code review' },
    { key: 'UNIT_TEST', name: 'Unit Test Evidence', description: 'Unit test execution evidence or test files attached' },
    { key: 'TEST_CASE', name: 'Test Cases Defined', description: 'Clear QA test cases or scenarios specified in issue or comments' },
    { key: 'DOCUMENTATION', name: 'Documentation Attached', description: 'API documentation or technical specification provided' },
    { key: 'ACCEPTANCE_CRITERIA', name: 'Acceptance Criteria', description: 'Explicit acceptance criteria defined on the Jira issue' },
    { key: 'DEVELOPER_UPDATE', name: 'Developer Update/Handover', description: 'Developer handover comment logged prior to QA transition' },
  ];

  for (const rule of qaRules) {
    await prisma.qARule.upsert({
      where: { key: rule.key },
      update: { name: rule.name, description: rule.description },
      create: { key: rule.key, name: rule.name, description: rule.description, isRequired: true },
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
